// Globals
    // The primary limiting values (dateRange, zoning, etc.).
var filterSliders = {};
//var filterHolders = []; // is an array so that we can count the order for placement (one must be above the other)
var filters = {};
var primaryValues = {};
primaryValues.dateRange = [200801, 200812];
primaryValues.maxDateRange = 4;
primaryValues.minDateRange = 1/12;
var savedGeograpes = {};

//primaryValues.dataType = 'sumsum';

var zoomType = 'city';
//var viewBounds = []; // left/top/right/bottom
var chart;
var infoWindow;
var showSupplemental = false;
var chartData = [];

var Geogrape_Error = Class.create(); // Simple, but this class can be used for more elegant errors later.
Object.extend(Geogrape_Error,
	{
		alert: function(alerttext) {
			Geogrape_Error.alert(alerttext, this);
		}
	}
);

var toggleSlider = function(event) {
    var slider = event.findElement('div.slider');
    var attribute = {};
    attribute.origValue = 0;
    if(slider.hasClassName('bottom')) {
	attribute.type = 'bottom';
	attribute.toValue = 20-slider.getHeight();
    } else if(slider.hasClassName('right')) { // privilege the 'bottom' class name, as things with 'right' may in fact be on the bottom. (ie the chart, which uses right for fullscreen)
	attribute.type = 'right';
	attribute.toValue = 20-slider.getWidth();
    } else if(slider.hasClassName('top')) { // top comes later, as even right is prefered to that.
	attribute.type = 'bottom';
	attribute.toValue = 20-slider.getHeight();
    } else if(slider.hasClassName('left')) {
	attribute.type = 'left';
	attribute.toValue = 20-slider.getWidth();
    }
    if(slider.hasClassName('out')) { // is out, needs to be hidden.
	new Effect.Tween(slider.identify(), attribute.origValue, attribute.toValue, {fps: 23, duration: 2.0}, function(p) {this.style[attribute.type] = p + 'px';});
	slider.addClassName('in').removeClassName('out');
    } else if(slider.hasClassName('in')) {
	new Effect.Tween(slider.identify(), attribute.toValue, attribute.origValue, {fps: 23, duration: 2.0}, function(p) {this.style[attribute.type] = p + 'px';});	    
	slider.addClassName('out').removeClassName('in');
    }
}

var killEvent = function(event) {
    event.stop();
}
/* Kudos to http://www.p01.org/releases/Drawing_lines_in_JavaScript/ */
function drawLine( lineObjectHandle, Ax, Ay, Bx, By, lineImgPath )
{
    /*
     *lineObjectHandle = an IMG tag with position:absolute
     */
    var
    xMin        = Math.min( Ax, Bx ),
    yMin        = Math.min( Ay, By ),
    xMax        = Math.max( Ax, Bx ),
    yMax        = Math.max( Ay, By ),
    boxWidth    = Math.max( xMax-xMin, 1 ),
    boxHeight   = Math.max( yMax-yMin, 1 ),
    tmp         = Math.min( boxWidth, boxHeight ),
    smallEdge   = 1,
    newSrc;

    while( tmp>>=1 )
        smallEdge<<=1;

    newSrc = lineImgPath+ smallEdge +( (Bx-Ax)*(By-Ay)<0?"up.gif":"down.gif" );
    if( lineObjectHandle.src.indexOf( newSrc )==-1 )
        lineObjectHandle.src = newSrc;
    
    var buttonDimensions = lineObjectHandle.up('.button').getDimensions();

    //	var buttonCenterX = Math.floor(buttonDimensions.width/2);
    //	var buttonCenterY = Math.floor(buttonDimensions.height/2);
    var buttonCenterX = 0;
    var buttonCenterY = 0;
    if(Bx-Ax < 0) {
	lineObjectHandle.style.cssText = 'left: ' + buttonCenterX + 'px';
    } else {
	lineObjectHandle.style.cssText = 'right: ' + buttonCenterX + 'px';
    }
    if(By-Ay < 0) {
	lineObjectHandle.style.cssText += 'top: ' + buttonCenterY + 'px';
    } else {
	lineObjectHandle.style.cssText += 'bottom: ' + buttonCenterY + 'px';
    }
    with( lineObjectHandle.style )
    {
	
        width   = boxWidth+"px";
        height  = boxHeight+"px";
	//	    left = xMin + "px";
	//	    top = yMin + "px";
    }
}
Object.extend(String.prototype, {
    dePx: function() {
	return this.substr(0,this.length-2);
    },
    rgbToArray: function() {
	return this.split(',').map(function(part) { return Number(part.replace(/[^0-9]/g, '')); });
    }
});

var pxCutoffs = {
    '71': function(distance) { return 0; }, // same day / one day
    '141': function(distance) { return ( Math.ceil((distance-70)/10) *1 ) }, // within X days
    '181': function(distance) { return ( Math.ceil((distance-140)/10)*7) }, // within X weeks
    '241': function(distance) { return ( Math.ceil((distance-180)/5)*30) }, // within X months (approx.)
    '1000': function(distance) { return ( Math.ceil((distance-240)/10)*365) } // within X years (approx.)
};
var calculateAfter = function(distance) {
    var cutoff;
    for(cutoff in pxCutoffs) {
	if(Number(cutoff) > Number(distance)) { break; }
    }
    return pxCutoffs[cutoff](Number(distance));
};
var afterCutoffs = {
    '1': function(days) { return 70; }, // same day, 70px
    '7': function(days) { return Math.ceil((days*10) + 70) },
    '30': function(days) { return Math.ceil(((days/7)*10) + 140) },
    '365': function(days) {return Math.ceil(((days/30)*5) + 180) },
    '4000': function(days){return Math.ceil(((days/365)*10)+240) }
};
var calculatePx = function(after) {
    var cutoff;
    for(cutoff in afterCutoffs) {
	if(Number(cutoff) > after) { break; }
    }
    return afterCutoffs[cutoff](after);
};
var cutoffMeanings = {
    '0': function(days) { return 'on same day' },
    '7': function(days) { return 'within ' + days + ' days' },
    '29': function(days) { return 'within ' + Math.floor(Number(days) /7) + ' weeks' },
    '364': function(days) { return 'within ' + Math.floor(Number(days)/30) + ' months' },
    '1000': function(days) { return 'within ' + Math.floor(Number(days)/365) + ' years' }
};
var prettyAfter = function(days) {
    var cutoff;
    for(cutoff in cutoffMeanings) {
	if(Number(cutoff) >= days) { break; }
    }
    return cutoffMeanings[cutoff](days);
}

var endDragging = function(draggable) {
//    window.console.log(draggable);
    if(draggable.element.hasClassName('filter')) {
	filters[draggable.element.identify()].updateSummary();
    }
};
var onDrag = function(draggable) {
    var lineHolder = draggable.element.childElements().find(function(childElement) { return childElement.match('.lineHolder'); });
    var line = lineHolder.childElements().find(function(childElement) {return childElement.match('.line'); });
    var after = lineHolder.siblings().find(function(childElement) {return childElement.match('.after'); });
    if(draggable.element.hasClassName('filter')) {
	if(draggable.element.up('.filter')) {
	    var left = draggable.element.style.left.dePx();
	    var top = draggable.element.style.top.dePx();
	    drawLine(
		line,
		0, 0, 
		left, top,
		'img/'
	    );
	    window.console.log('left: ' + left + ', top: ' + top);
	    window.console.log(calculateAfter((Math.sqrt(left*left + top*top))));
	    after.writeAttribute({time: calculateAfter((Math.sqrt(left*left + top*top)))});
	}
    	filters[draggable.element.identify()].updateSummary();
    }
};
Draggables.addObserver({ // update the relationship lines for filters.
    onDrag: function(eventName, draggable, event) {
	onDrag(draggable);
	event.stop();
    },
    onEnd: function(eventName, draggable, event) {
	endDragging(draggable);
    }
});

var Filter = Class.create();
Object.extend(Filter.prototype, {
    lotValues: {
	"zoning": {
	    name: 'zoning',
	    type: 'list',
	    options: {
		'All Residential': 'R',
		'All Commercial': 'C',
		'All Manufacturing': 'M'
	    }
	},
	'numbldgs':{
	    name:"number of buildings",
	    type:'range',
	    options: {
		'More than one': '2 9999',
		'At least one': '1 9999',
		'One': '1 1',
		'None': '0 0'
	    }
	},
/*	'yearbuilt': {
	    name:"year built",
	    type:'range'
	},  */
	'unitsres': {
	    name:"residential units",
	    type: 'range',
	    options: {
		'Greater than 4 Units': '5 9999',
		'1 to 4 Units': '1 4',
		'Single Unit': '1 1',
		'None': '0 0',
	    }
	},
	'dataType': {
	    name: 'count by',
	    type: 'range',
	    options: {
		'Number per month': 'sumSum',
		'Dollars per month': 'sumDollar'
	    }
	}
/*	,'numfloors': {
	    name:"number of floors",
	    type: 'range'
	}*/
    },
    modifyLotValuesForm: function() {
	if(!this.initial) { return; }
	if(this.initialLotValuesSelect.visible()) { // If this is the initial change, hide the initial selector
	    this.initialLotValuesSelect.value = 'default'; // reset it for reappearance
	    this.initialLotValuesSelect.hide();
	    this.newLotValuesChoice();
	} else {
	    this.newLotValuesChoice();
	}
    },
    newLotValuesChoice: function(defaultSelection) {
	if(this.lotValuesForm.select('.lotValuesChoice').size()>=$H(this.lotValues).size()) { return; }// don't create too many.
	var lotValuesChoice = new Element('div', {className: 'lotValuesChoice'});
	var lotValuesSelect = new Element('select', {className: 'lotValuesSelect'});
	var lotValuesChoice2 = new Element('span', {className: 'lotValuesChoice2'});
	this.lotValuesForm.insert(lotValuesChoice.insert(lotValuesSelect).insert(lotValuesChoice2));
	this.generateLotValuesSelect(lotValuesSelect);
	this.changeLotValuesChoice(lotValuesChoice);
	if(defaultSelection) {
	    lotValuesSelect.value = defaultSelection;
	    this.changeLotValuesChoice(lotValuesChoice);
	}
	lotValuesSelect.observe('change', this.changeLotValuesChoice.bind(this).curry(lotValuesChoice));
	this.updateSummary();
	return lotValuesChoice;
    },
    generateLotValuesSelect: function(lotValuesSelect) {
	if(lotValuesSelect.getValue()) {
	    lotValuesSelect.select(':not([value='+$F(lotValuesSelect)+'])').invoke('remove'); // remove any of the options that aren't already selected.
	    this.lotValues[$F(lotValuesSelect)].taken = true;
	}
	$H(this.lotValues).each(function(pair) { // regen the list of options
	    if(pair.value.taken == true) { return; }
	    lotValuesSelect.insert(new Element('option', {value: pair.key}).update(pair.value.name));
	});
    },
    changeLotValuesChoice: function(lotValuesChoice) {
	var lotValuesSelect = lotValuesChoice.select('.lotValuesSelect').first();
	this.generateLotValuesSelect(lotValuesSelect);
	this.regenLotValuesChoices();
	this.updateLotValuesChoice2(lotValuesChoice);
	this.updateSummary();
    },
    updateLotValuesChoice2: function(lotValuesChoice) {
	var lotValuesChoice2 = lotValuesChoice.select('.lotValuesChoice2').first();

	var lotValueFormat = this.lotValues[$F(lotValuesChoice.select('.lotValuesSelect').first())];
	if(lotValueFormat.options) {
	    var lotValuesSelect2 = new Element('select', {className: 'lotValuesSelect2'});
	    for(option in lotValueFormat.options) {
		lotValuesSelect2.insert(new Element('option', {value: lotValueFormat.options[option]}).update(option));
	    }
	}
	lotValuesChoice2.update(lotValuesSelect2);
	lotValuesSelect2.observe('change', this.updateSummary.bind(this));
    },
    removeLotValuesChoice: function(lotValuesChoice) {
	lotValuesChoice.remove();
	if(this.lotValuesForm.select('.lotValuesChoice').size() == 0) {
	    this.initialLotValuesSelect.show();
	} else {
	    this.regenLotValuesChoices();
	}
	this.updateSummary();
    },
    regenLotValuesChoices: function() {
	var lotValuesChoices = this.lotValuesForm.select('.lotValuesChoice');
	var i = 1;
	$H(this.lotValues).each(function(pair) { pair.value.taken = false; }); // reset whether lot values are taken.
	this.lotValuesForm.select('.lotValuesSelect').invoke('getValue').each( function(takenValue) {
	    if(!takenValue) {return};
	    this.lotValues[takenValue].taken = true;
	}.bind(this));
	lotValuesChoices.each(function(lotValuesChoice) {
	    this.generateLotValuesSelect(lotValuesChoice.select('.lotValuesSelect').first());
	    lotValuesChoice.select('.pressable').invoke('remove'); // remove the old buttons.
	    if(i<$H(this.lotValues).size()) { // create a new and button
		var andButton = new Element('span', {className: 'pressable andButton'}).update('and...');
		lotValuesChoice.insert(andButton);
		andButton.observe('click', this.newLotValuesChoice.bind(this));
	    }
	    // create a new x button
	    var xButton = new Element('span', {className: 'pressable xButton'}).update('X');
	    lotValuesChoice.insert(xButton);
	    xButton.observe('click', this.removeLotValuesChoice.curry(lotValuesChoice).bind(this));

	    i++;
	}.bind(this));
//	this.updateSummary();
    },
    initialize: function(options) {
	this.filterTypes = { // when an option is selected, the first 'children' attribute is created -- but not any of the grandchildren. content displayed by default.
	    // 'requirement' column is optional, is formatted 'previous|initial: {'key': ['and and and', 'and and and']}, with each array being an or and all keys being required.
	    // 'description' column should be applied to the immediate parent of the value -- in other words, 'select' for options.
	    // if no description specified (in an option, for example) the content value is used.
	    // there must be a limit for all free inputs -- either 'name', 'percent' or 'dollar', which will also format the text accordingly.
	    // free inputs may also have an 'append' column, to append some text (such as 'of previous sale' for % sale columns)
	    'type': {element: ['select', 'type', ''], description: ' ',
	      content: {
		  'mortgage': {element: ['option', '', 'Mortgages Created'],
			       appendContent: {
				   'where': {element: ['select', 'and', ''], description: '',
					     content: {
						 'default': { element: ['option', '', 'All']},
						 'to': { element: ['option', '', 'By lender...'],
							 appendContent: {
							     'nameType': { element: ['select', 'to', ''], description: 'by',
									   content: {
									       'default':{ element: ['option', '', 'Any lender']},
									       'list':{ element: ['option', '', 'Name...'],
											  appendContent: {
											      'explicit': {element: ['input', 'or', ''],
													   limit: 'name'}
											  }
										      },
									       'previous purchase from':{element: ['option', '', 'Previous seller'],
											   requirement: {'previous': {'type': ['purchase']}}}
									   }
									 }
							 }
						       },
						 'from': { element: ['option', '', 'For borrower...'],
							   appendContent:	{
							       'nameType': { element: ['select', 'from', ''], description: 'for',
									     content: {
										 'default': {element: ['option', '', 'Anyone']},
										 'list': {element: ['option', '', 'Name...'],
											  appendContent: {
											      'explicit': {element: ['input', 'or', ''],
													   limit: 'name'}
											  }
											 },
										 'previous purchase to': {element: ['option', '', 'Previous buyer'],
											      requirement: {'previous': {'type': ['purchase']}}}
									     }
									   }
							   }
							 },
						 'worth': {  element: ['option', '', 'Worth...'],
							     appendContent: {
								 'bottom': { element: ['select', 'bottom', 'More than'], description: 'worth more than',
									     content: {
										 'default': {element: ['option', '', '$1']},
										 'explicit bottom':	{ element: ['option', '', '$'],
												  appendContent: {
												      'amount':{ element: ['input', '', ''],
														 limit:'dollar'} // inputs must be text.
												  }
												}
									     }
									   },
								 'top':{ element: ['select', 'top', 'Less than'], description: 'worth less than',
									 content: {
									     'default': {element: ['option', '', 'No limit']},
									     'explicit top': {element: ['option', '', '$'],
											  appendContent: {
											      'amount': { element: ['input', '', ''],
													  limit: 'dollar'}
											  }
											 }
									 }
								       }
							     }
							  }
					     }
					    }
			       }
			      },
		  'purchase': { element: ['option', '', 'Sales'],
				appendContent: {
				    'where': { element: ['select', 'and', ''],
					       content: {
						   'default': { element: ['option', '', 'All']},
						   'from': { element:['option', '', 'By seller...'],
							     appendContent: {
								 'nameType': { element: ['select', 'from', ''], description: 'from',
									       content: {
										   'default': { element: ['option', '', 'Any owner']},
										   'list': { element: ['option', '', 'Name...'],
											     appendContent: {
												 'explicit': {element: ['input', 'or', ''],
													      limit: 'name'}
											     }
											   },
										   'previous purchase to': {element: ['option', '', 'Previous buyer'], description: 'previous buyer',
												requirement: {'previous': {'type': ['purchase']}}}
									       }
									     },
							     }
							   },
						   'to': { element: ['option', '', 'To buyer...'],
							   appendContent: {
							       'nameType': { element: ['select', 'to', ''], description: 'to',
									     content: {
										 'default': { element: ['option', '', 'Anyone']},
										 'list': { element: ['option', '', 'Name...'],
											   appendContent: {
											       'explicit': {element: ['input', 'or', ''],
													    limit: 'name'}
											   }
											 },
										 'previous mortgage,mortgageresale to': { element: ['option', '', 'Previous mortgagee'], description: 'previous mortgagee',
											       requirement: {'previous': {'type': ['mortgage']}}}
									     }
									   }
							   }
							 },
						   'worth': { element: ['option', '', 'Worth...'],
							      appendContent: {
								  'bottom': { element: ['select', 'bottom', 'More than'], description: 'for more than',
									      content: {
										  'default': {element: ['option', '', '$1']},
										  'explicit bottom': {element: ['option', '', '$'],
											       appendContent: {
												   'amount': {element: ['input', '', ''],
													      limit: 'dollar'}
											       }
											      },
										  'previous purchase': { element: ['option', '', '% Previous Sale'],
												appendContent: {
												    'amount': {element:['input', '', ''],
													       limit: 'percent',
													       append: 'of previous sale'}
												},
												requirement: {'previous': {'type': ['purchase']}}
											      }
									      }
									    },
								  'top': { element: ['select', 'top', 'Less than'], description: 'for at least',
									   content: {
									       'default': {element: ['option', '', 'No limit']},
									       'explicit top': {element: ['option', '', '$'],
											    appendContent: {
												'amount': {element: ['input', '', ''],
													   limit: 'dollar'}
											    }
											   },
									       'previous purchase': { element: ['option', '', '% Previous Sale'],
											     appendContent: {
												 'amount': {element: ['input', '', ''],
													    limit: 'percent',
													    append: 'of previous sale'}
											     },
											     requirement: {'previous': {'type': ['purchase']}}
											   }
									   }
									 }
							      }
							    }
					       }
					     }
				}
			      },
	    'foreclosure': { element: ['option', '', 'Foreclosure'],
				   appendContent: {
				       'where': { element: ['select','and', ''],
						  content: {
						      'default': {element: ['option', '', 'All']},
						      'to': { element: ['option', '', 'By lender (REO)...'],
							      appendContent: {
								  'nameType': { element: ['select', 'to', ''], description: 'to',
										content: {
										    'default': { element: ['option', '', 'Any lender']},
										    'list': { element: ['option', '', 'Name...'],
											   appendContent: {
											       'explicit': {element: ['input', 'or', ''],
													    limit: 'name'}
											   }
											 },
										    'previous mortgage,mortgageresale to': { element: ['option', '', 'Previous mortgagee'], description: 'previous mortgagee',
												  requirement: {'previous': {'type': ['mortgage mortgageresale']}}},
										    'initial mortgage to': { element: ['option', '', 'Initial mortgagee'], description: 'first mortgagee',
												 requirement: {'initial': {'type': ['mortgage mortgageresale']}}}
										}
									      }
							      }
							    }
						  }
						}
				   }
		      		 },
		  'abandonment': { element: ['option', '', 'Abandonment'] }, // the to/from values for abandonment are worthless
		  'mortgageresale': { element: ['option', '', 'Mortgages Sold'] ,
				   appendContent: {
				       'where': { element: ['select','and', ''],
						  content: {
						      'default': {element: ['option', '', 'All']},
						      'to': { element: ['option', '', 'To lender...'],
							      appendContent: {
								  'nameType': { element: ['select', 'to', ''], description: 'to',
										content: {
										    'default': { element: ['option', '', 'Any lender']},
										    'list': { element: ['option', '', 'Name...'],
											   appendContent: {
											       'explicit': {element: ['input', 'or', ''],
													    limit: 'name'}
											   }
											 },
										    'initial mortgage,mortgageresale to': { element: ['option', '', 'Initial mortgagee'], description: 'initial mortgagee',
												  requirement: {'initial': {'type': ['mortgage mortgageresale']}}}
										}
									      }
							      }
							    },
						      'from': { element: ['option', '', 'By lender...'],
							      appendContent: {
								  'nameType': { element: ['select', 'from', ''], description: 'by',
										content: {
										    'default': { element: ['option', '', 'Any lender']},
										    'list': { element: ['option', '', 'Name...'],
											   appendContent: {
											       'explicit': {element: ['input', 'or', ''],
													    limit: 'name'}
											   }
											 },
										    'previous mortgage,mortgageresale to': { element: ['option', '', 'Previous mortgagee'], description: 'previous mortgagee',
												  requirement: {'previous': {'type': ['mortgage mortgageresale']}}}
										}
									      }
							      }
							      }
						  }
						}
				   }
				    },
		  'default': { element: ['option', '', 'Disabled'] } // 'default' will eliminate the value.
	      }
		    }
	};
   
	this.parentElement = options.parentElement; // an HTML element
	this.filterHolder = options.filterHolder;  // an object
	this.initial = (options.initial)? options.initial : false;
	
	this.filterSlider = (this.parentElement.match('.filterSlider'))? this.parentElement : this.parentElement.up('.filterSlider');
//	this.filterSlider = this.filterHolder.up('.filterSlider');

	this.isDraggable = options.isDraggable;

	this.element = new Element('span', {className: 'button filter top left draggable'});	

	this.topBar = new Element('div', {className: 'topbar'});
	this.summary = new Element('div', {className: 'pressable summary'}); // A summary of what this does, editable upon click.  Replaced by modifyHolder at that point.
	this.topBar.insert(this.summary);
	
	if(!this.initial) { // initial filter doesn't have a close button
	    this.closeButton = new Element('div', {className: 'pressable closeButton'}).update('X');
	    this.topBar.insert(this.closeButton);
	    this.closeButton.observe('click', this.remove.bind(this));
	}
	this.element.insert(this.topBar);

	if(this.initial) { // only include the lotValues option for the initial filter. 
	    this.lotValuesHolder = new Element('div', {className: 'lotValuesHolder'});
	    this.lotValuesForm = new Element('form', {className: 'lotValuesForm'}).update('On ');
	    this.initialLotValuesSelect = new Element('select', {className: 'initialLotValuesSelect'}).insert(new Element('option', {value: 'default'}).update('all properties')).insert(new Element('option').update('Choose...'));
	    this.lotValuesHolder.insert(this.lotValuesForm.insert(this.initialLotValuesSelect));
	    this.initialLotValuesSelect.observe('change', this.modifyLotValuesForm.bind(this));
	}

	// Create the values form.
	this.editValuesHolder = new Element('div', {className: 'editValuesHolder'}); // user to add as many values to the 'values' span as they desire.  Provides an option which opens up onto an editable series of text inputs.
	this.editValues = {};

//	this.typeSelect.observe('change', this.typeChanged.bind(this));
//	this.editValuesHolder.update(this.editValues[this.typeSelect.getValue()]);
	
	this.thenHolder = new Element('span', {className: 'thenHolder'}); // This holds all child filters.
	this.element.insert(this.thenHolder);

	this.addFilter = new Element('div', {className: 'pressable addFilter'}).update('Limit this filter with another.'); // Allows user to drag out as many new limiting filters as they desire (adds them to the 'then' span).
	this.addFilter.observe('mousedown', function(event) {
	    event.stop();
	    var childFilter = new Filter({
		parentElement: this.thenHolder,
		filterHolder: this.filterHolder,
		isDraggable: true
	    });
	    childFilter.draggable.initDrag(event); // start dragging immediately on new filter.
	}.bind(this));
	
	this.modifyHolder = new Element('div', {className: 'modifyHolder'}); // This is the blinder-enabled div which allows all modification.
	this.modifyHolderWrapper = new Element('div', {className: 'noPadding'}); // Requires a wrapping div.
	this.modifyHolder.insert(this.modifyHolderWrapper);
	this.modifyHolderWrapper.insert(this.typeForm);
	if(this.lotValuesHolder){
	    this.modifyHolderWrapper.insert(this.lotValuesHolder);
	}
	this.modifyHolderWrapper.insert(this.editValuesHolder);
	this.modifyHolderWrapper.insert(this.addFilter);
	
//	this.minimizeButton = new Element('span', {className: 'pressable minimize'}).update('_');
	this.modifyHolder.insert(this.minimizeButton);

	this.element.insert(this.modifyHolder);

	this.executeFilterTypes();
	this.modifyHolder.hide();

	this.line = new Element('img', {className: 'line'}); // This line connects to the previous filter.
	this.lineKey = new Element('span', {className: 'lineKey'}); // This key identifies what the length of the line means.

	this.after = new Element('span', {className: 'after'});
	this.element.insert(this.after);

	this.lineHolder = new Element('div', {className: 'lineHolder'}); // To prevent line from shuffling around.
	this.lineHolder.insert(this.line);
	this.lineHolder.insert(this.lineKey);
	this.element.insert(this.lineHolder);
	this.lineHolder.observe('click', killEvent);
	this.lineHolder.observe('mousedown', killEvent);

	this.parentElement.insert(this.element);

	filters[this.element.identify()] = this;

	this.summary.observe('click', this.toggle.bind(this));

	this.updateSummary();

	if(this.isDraggable) {
	    //event.stop() // this code needs to be part of the handler to create a draggable filter.
	    this.id = this.element.identify();
	    this.draggable = new Draggable(this.id);
	    
	    if(!options.stopDrag) {
		Draggables.activate(this.draggable);
	    }
//	    this.draggable.initDrag()
	}

	return this;
    },
    remove: function() { // recursive removal.
	this.thenHolder.select('.filter').invoke('identify').each( function(filterId) {
	    filters[filterId].remove();
	    delete filters[filterId];
	});
	this.element.remove();
	this.updateFilterSliderSummary();
    },
    recreateFilter: function(request) {
	this.element.down('select.type').value = request.type;
	
	if(request.values) {
	    for(key in request.values) {
		this.element.down('div.append select').value = key;
		this.element.down('div.append select').simulate('change');
		this.element.down('div.append.' + key + ' select').value = request.values[key][0];
		this.element.down('div.append.' + key + ' select').simulate('change');
		if(request.values[key][0] == 'list') {
		    this.element.down('div.append.' + key + ' div.append.list input').value = request.values[key][1];
		    for(var i = 2; i < request.values[key].length; ++i) {
			this.element.down('div.append.' + key + ' div.append.list .orButton').simulate('click');
			this.element.down('div.append.' + key + ' div.append.list').select('input').last().value = request.values[key][i];
		    }
		}
//		this.recalculateAndSelects();
	    }
	}
	if(request.lotValues) {
	    this.initial = true;
	    for(lotValue in request.lotValues) {
		var newLotValuesChoice = this.newLotValuesChoice(lotValue);
		newLotValuesChoice.select('.lotValuesChoice2 select').first().value = String(request.lotValues[lotValue]).gsub(',', ' ');
	    }
	}
	window.console.log(request);
	window.console.log(this.thenHolder);
	if(request.then) {
//	    for(thenFilterRequest in request.then) {
	    request.then.each(function(thenFilterRequest) {
		window.console.log(thenFilterRequest.after[1]);
		window.console.log(calculatePx(thenFilterRequest.after[1]));
		var distance = calculatePx(thenFilterRequest.after[1]);

		var childFilter = new Filter({
		    parentElement: this.thenHolder,
		    filterHolder: this.filterHolder,
		    isDraggable: true,
		    stopDrag: true
		});
//		childFilter.draggable.initDrag(event); // start dragging immediately on new filter.
		childFilter.element.style.left = distance + 'px';
		childFilter.element.style.top = '0px';
		onDrag(childFilter.draggable);
		endDragging(childFilter.draggable);
//		window.console.log(thenFilterRequest);
		childFilter.recreateFilter(thenFilterRequest);
	    }.bind(this));
//	    window.console.log(request.thenFilter);
/*	    request.thenFilter.each(function(thenFilter) {

	    });*/
	}
	this.updateSummary();
    },
    processFilter: function (prevFilterType, setFinalFilter) {
	var obj = {};

	if(this.initial) { // include the lotValuesHolder in initial object
	    obj.lotValues = this.extractValuesFromLotValuesHolder();
	}
	obj.values = this.extractValuesFromEditValuesHolder();
	if(!obj.values) { return null; } // disabled filter
	obj.type = obj.values.type;
	delete obj.values.type;

	if(this.after.readAttribute('time')) {
	    if(prevFilterType) {
		if(obj.type == prevFilterType) {
		    obj.after = [1, this.after.readAttribute('time')]; // one day min if same type
		} else if(obj.type == 'foreclosure' && prevFilterType == 'mortgage') {
		    obj.after = [1, this.after.readAttribute('time')]; // one day min if same type
		}else {
		    obj.after = [0, this.after.readAttribute('time')]; // zero day min otherwise.
		}
	    }
	}
	this.thenHolder.childElements().each(function(thenFilter) {
	    if(!obj.then) { obj.then = []; }
	    obj.then.push(filters[thenFilter.identify()].processFilter(obj.type, setFinalFilter)); // recursively process succeeding filters
	});
	setFinalFilter(this);
	return obj;
    },
//	var recalculateAndSelects = function(select, selectHolder, parent) { // refigure the and selects for this type.
    recalculateAndSelects: function(select, selectHolder, parent) {
	    var selection = $F(select);
	    if(!parent) {return; }
	    var similarAndSelectHolders = parent.select('.' + selectHolder.className.replace(' ', '.'));
	    var similarAndSelects = similarAndSelectHolders.invoke('select', 'select.and').invoke('first');
	    if(similarAndSelects.size() == 1 && selection == 'default') {
		selectHolder.select('span.and').first().hide();
		selectHolder.select('span.closeButton').first().hide();
		return 1;
	    } // only one game in town, leave it alone.
	    if(similarAndSelects.size() == 1 && selection != 'default') {
		// do this through parent because if this is called via a closeButton, seletHolder will actually be disappeared.
		parent.select('option').invoke('writeAttribute', 'disabled', false);
		parent.select('span.and').invoke('show');
		parent.select('span.closeButton').invoke('hide');
		return 1;
	    }
	    similarAndSelects.invoke('select', '[value=default]').flatten().invoke('writeAttribute', 'disabled', true);
	    var totalOptions = similarAndSelects.invoke('select', 'option').flatten().invoke('readAttribute', 'value').uniq();
	    var takenOptions = similarAndSelects.invoke('getValue');
	    var freeOptions = totalOptions.clone();
	    takenOptions.push('default');
	    takenOptions = takenOptions.uniq();
	    takenOptions.each(function(takenOption) { freeOptions = freeOptions.without(takenOption); });

	    parent.select('span.and').invoke('show');
	    parent.select('span.closeButton').invoke('show');

	    similarAndSelects.each(function(select) {
		if($F(select) == 'default') {
		    select.value = freeOptions.pop();
		    takenOptions.push(select.value);
		}
	    });
	    similarAndSelects.each(function(select) {
		var optionsToRemove = takenOptions.without($F(select));
		select.select('option').invoke('writeAttribute', 'disabled', false);
		optionsToRemove.each(function(optionToRemove) {
		    select.select('[value=' + optionToRemove + ']').invoke('writeAttribute', 'disabled');
		});
	    });
	    if(takenOptions.size() == totalOptions.size()) { // if no more options, kill the and spans
		parent.select('span.and').invoke('hide');
	    }
	    return similarAndSelects;
	},

    executeFilterTypes: function() {
	this.editValuesForm = new Element('form', {className: 'editValuesForm'});
	this.editValuesHolder.insert(this.editValuesForm);
	
	this.buildFilterTypes(this.editValuesForm, 'type', this.filterTypes.type);
	this.editValuesForm.select('.holder').first().show();
    },
    recalculateOrInputs: function(inputHolderParent) {
//	var recalculateOrInputs = function(inputHolderParent) {
	    if(inputHolderParent.select('input').size() > 1) {
		inputHolderParent.select('span.closeButton').invoke('show');
	    } else {
		inputHolderParent.select('span.closeButton').invoke('hide');
	    }
    },

    buildFilterTypes: function(parent, id, component) {
//	var buildFilterTypes = function (parent,id,component) {
	    var elementType = component['element'][0];
	    var elementClasses = component['element'][1];
	    var elementContent = component['element'][2];
	    var element = new Element(elementType, {className: elementClasses});//.update(component['element'][2]);
	    if(component['description']) {
		element.writeAttribute({'description': component['description']});
	    }
	    if(elementType != 'select' && elementType != 'input') {
		element.update(elementContent);
	    }

	    var content = component['content'];
	    var appendContent = component['appendContent'];

	    if(elementType == 'input') {
		element.writeAttribute({type: 'text'});
		if(element.hasClassName('or')) { // is an or - input, treat accordingly.
		    var inputHolder = new Element('div', {className: id + ' holder'});
		    var orButton = new Element('span', {className: 'orButton pressable'}).update('or...');
		    var closeButton = new Element('span', {className: 'closeButton pressable'}).update('X').hide();
		    orButton.observe('click', function(input, inputHolder, parent,  orButton, closeButton) { // when or is clicked, show the X button & make a new input
			this.buildFilterTypes(parent, id, component);
			this.recalculateOrInputs(parent); // show/hide close buttons
		    }.bind(this).curry(element, inputHolder, parent, orButton, closeButton));
		    closeButton.observe('click', function(input, inputHolder, parent, orButton, closeButton) {
			inputHolder.remove();
			this.recalculateOrInputs(parent); // show/hide close buttons
		    }.bind(this).curry(element, inputHolder, parent, orButton, closeButton));
		    inputHolder.insert(element).insert(orButton).insert(closeButton);
		    parent.insert(inputHolder);
		}
		element.observe('blur', this.updateSummary.bind(this));
		element.observe('keypress', function() {
		    this.updateSummary.bind(this).delay(.1);
		}.bind(this));

		element.focus();
	    } else if (elementType == 'select') { // <select> needs a holder to store its contingent values.
//		var selectHolder = new Element('fieldset', {className: id + ' holder'});
		var selectHolder = new Element('fieldset', {className: id + ' holder'});
		var selectLegend = new Element('legend', {className: id + ' legend'});
		var selectLabel = new Element('label', {'for': element.identify()}).update(elementContent);
		// an 'and' style select -- every time it changes, check all its bretheren to make sure the same children can't be selected.
		// also, make sure that there is an 'and' option provided there are more possibilities, and it is not default.
		if(element.hasClassName('and')) {
		    var andButton = new Element('span', {className: 'and pressable'}).update('and...').hide();
		    var closeButton = new Element('span', {className: 'closeButton pressable'}).update('X').hide();
		    closeButton.observe('click', function(select, selectHolder, parent) {
			var similarAndSelects = this.recalculateAndSelects(select, selectHolder, parent);
			selectHolder.remove();
			var similarAndSelects = this.recalculateAndSelects(select, selectHolder, parent);
		    }.bind(this).curry(element, selectHolder, parent));
		    andButton.observe('click', function(select, selectHolder, parent) { // lock the current selection in place, make the other ones selectable elsewhere.
			this.buildFilterTypes(parent, id, component);
			this.recalculateAndSelects(select, selectHolder, parent);
		    }.bind(this).curry(element, selectHolder, parent));
		}
		selectHolder.insert(selectLegend.insert(selectLabel).insert(element).insert(andButton).insert(closeButton));
		parent.insert(selectHolder);
	    }
	    if(!element.up()) {
		parent.insert(element);
	    }
	
	    if(elementType == 'option') { element.writeAttribute('value', id); } // add the option values
	    if(content) { // build the content (options) before adding the observers to 'select' elements.
		for(c in content) {
		    this.buildFilterTypes(element, c, content[c]);
		};
	    }
	    if(elementType == 'select') {
//		element.observe('change', changeSelect.bind(this).curry(element, selectHolder, parent,id, component));
//		changeSelect.bind(this)(element, selectHolder, parent, id, component);
		element.observe('change', this.changeEditValuesSelect.bind(this).curry(element, selectHolder, parent, id, component));
		this.changeEditValuesSelect.bind(this)(element, selectHolder, parent, id, component);
	    }
	    this.updateSummary();
//	}//.bind(this);

    },
    changeEditValuesSelect: function(select, selectHolder, parent, id, component) {
//		var changeSelect = function(select, selectHolder, parent, id,component) {
//		    window.console.log('changeSelect');
//		    select.fire('geogrape:bleh', {});
//		    window.console.log(select.fire);
		    selectHolder.select('div.append').invoke('remove');
		    if(select.hasClassName('and')) {
			var similarAndSelects = this.recalculateAndSelects(select, selectHolder, parent);
		    }
		    var selection = $F(select);
		    var appendContent = component.content[selection].appendContent;
		    if(appendContent) { // should be called for <option> elements
			var appendDiv = new Element('div', {className: 'append ' + selection});
			for(ac in appendContent) {
			    this.buildFilterTypes(appendDiv,ac,appendContent[ac]);
			}
			selectHolder.appendChild(appendDiv);
		    }
//		    selectHolder.select('div:not(.' + selection + ').append').invoke('remove');
		    this.updateSummary(); // only update the summary if nothing is going to be built (building updates summary itself)
    },
    extractValuesFromEditValuesHolder: function(options) {
	var options = (options)? options : {};
	var values = {};

	this.editValuesHolder.select('fieldset').each(function(holder) {
	    var key = holder.down('select').classNames(); 
	    var value = $w(holder.down('select').getValue()); // splits the value, so "previous purchase" becomes ['previous', 'purchase'] when fed into createMapAndGraph

	    if(key == 'and') { // 'and' selects only control the flow of values, they hold nothing themselves.
		return;
	    }
	    if(holder.down('select').readAttribute('description') && options.description) { // if there's a separate description, use it when writing description
		key = holder.down('select').readAttribute('description');
	    }
	    if(value[0] == 'default') { // default values are of no concern
		return;
	    }
//	    if(holder.select('input')) { // not all holders have inputs.
//	    if(value.substr('list') || value.substr('explicit') || value.substr('relation') || value.substr('previous')) {
	    if(value.find(function(v) { return (v=='list' || v == 'explicit' || v == 'relation' || v == 'previous'); })) {
		value.push(holder.select('input').invoke('getValue').invoke('toLowerCase')); // first arg is the type of value, second (and succeeding) args are the values.
		value = value.flatten();
		value = value.compact();
	    } else {
		value = value[0];
	    }
	    values[key] = value;
	});
//	window.console.log(this.editValuesHolder.select('fieldset'));
	if($H(values).size() == 0) { return null; } // we want to ignore values when they don't exist.
	return values;
    },
    extractValuesFromLotValuesHolder: function() {
	var values = {};
	
	if(this.initial) { // lotValues for initial
	    this.lotValuesHolder.select('.lotValuesChoice').each(function(lotValuesChoice) { // will be none if the initial is still in place.
		if(lotValuesChoice.select('.lotValuesSelect2').size() == 0) { return; }
		values[$F(lotValuesChoice.select('.lotValuesSelect').first())] = $w($F(lotValuesChoice.select('.lotValuesSelect2').first()));
	    });
	}
	if($H(values).size() == 0) { return null; } // we want to ignore values when they don't exist.
	return values;
    },
    updateSummary: function() {
	var summaryText = '';
	var editValues = this.extractValuesFromEditValuesHolder({description: true});
	$H(editValues).each( function(pair) {
	    summaryText += pair.key + ' ' + pair.value + ' ';
	}.bind(this));
	if(this.after) {
	    if(this.after.readAttribute('time')) {
		summaryText += ' ' + prettyAfter(this.after.readAttribute('time'));
	    }
	}
	if(this.initial) {
	    var lotValues = this.extractValuesFromLotValuesHolder();
	    if(lotValues) {
		summaryText += ' on properties with ';
		var propertyLimits = [];
		$H(lotValues).each( function(pair) {
		    propertyLimits.push($H(this.lotValues[pair.key].options).find(function(optionValues) { return optionValues.value == pair.value.join(' '); }).key + ' ' +  this.lotValues[pair.key].name);
		}.bind(this));
		summaryText += propertyLimits.join(' and ');
	    }
	}

	this.summary.update(summaryText);
	this.filterHolder.updateSummary();
//	this.updateFilterSliderSummary();
    },
    showSummary: function() {
	this.updateSummary();
	this.summary.show();
    },
    toggle: function(event) {
	event.stop();
	if(this.toggling == true) { return;}
	if(this.modifyHolder.hasClassName('down')) {
	    this.minimize();
	} else {
	    this.maximize();
	}
	this.toggling = true;
	var toggleTrue = function() { this.toggling = false; }.bind(this);
	toggleTrue.delay(1.2);
    },
    minimize: function() {

	if(this.modifyHolder.hasClassName('down')) {
	    this.showSummary();
	    //	    ShowSummary(summary.adjacent('div.modifyHolder').first(), summary); // this involves regen'ing the summary.
	    Effect.SlideUp(this.modifyHolder.identify(), {queue: {position: 'end', scope: this.modifyHolder.identify()}});
	    this.modifyHolder.removeClassName('down'); // remove its 'down' status
	}
    },
    maximize: function(event) {
	if(!this.modifyHolder.hasClassName('down')) {
	    this.summary.hide();

//	    Effect.multiple(this.filterSlider.select('.modifyHolder.down').invoke('removeClassName', 'down').invoke('identify'), Effect.SlideUp, {queue}); // slideup any modify holders that are down for this filterSlider
	    this.filterSlider.select('.modifyHolder.down').each(function(modifyHolder) {
		modifyHolder.removeClassName('down');
		Effect.SlideUp(modifyHolder.identify(), {queue: {position: 'end', scope: modifyHolder.identify()}});
	    });

	    this.filterSlider.select('.summary').invoke('show');
	    Effect.SlideDown(this.modifyHolder.identify(), {queue: {position: 'end', scope: this.modifyHolder.identify()}});
	    this.modifyHolder.addClassName('down');
	}
    },
    typeChanged: function() {
	this.editValuesHolder.update(this.editValues[this.typeSelect.getValue()]);
	
	this.updateSummary();
    }
});

var FilterHolder = Class.create();
Object.extend(FilterHolder.prototype, {
    defaultColors: [ // feed these in absence of any specific color.
	[200,200,255],
	[255,200,200],
	[200,255,200]
    ],
    initialize: function(options) {
	var requiredOptions = ['filterSlider'];
	requiredOptions.each(function(requiredOption) {
	    if(!options[requiredOption]) {
		window.console.log('no option ' + requiredOption + ' while making FilterHolder.');
		return false;
	    }
	});
	for(var k in options) {
	    this[k] = options[k]; // apply options.
	}
	this.summary = new Element('span', {className: 'summary pressable'});
	this.closeButton = new Element('span', {className: 'closeButton pressable'}).update('X');
	this.closeButton.observe('click', this.remove.bind(this));

	this.toggle = new Element('span', {className: 'toggle'});
	// determine top of toggle.

	this.toggleContainer = new Element('div', {className: 'togglecontainer'});
	this.toggleContainer.insert(this.toggle.insert(this.summary).insert(this.closeButton));
	this.element = new Element('div', {className: 'filterHolder left top bottom right'});
	this.id = this.element.identify();

	this.place = this.filterSlider.filterHolders.size();
	this.filterSlider.filterHolders.push(this);

//	filterHolders.push(this);
	

	this.color = (this.color)? this.color : this.defaultColors[this.place % this.defaultColors.size()];
	this.element.setStyle({
	    background: '#' + this.color.invoke('toColorPart').join(''),
	    borderColor: '#' + this.strokeColor().invoke('toColorPart').join('')
	});
	this.summary.setStyle({
	    background: '#' + this.color.invoke('toColorPart').join(''),
	    borderColor: '#' + this.strokeColor().invoke('toColorPart').join('')	    
	});
	

	this.filterSlider.element.insert(this.toggleContainer);
	this.filterSlider.sliderFill.insert(this.element); // put the filterholder inside the sliderFill rather than the slider, so that togglecontainers can work over or below the sliderFill's shadows

	this.initialFilter = new Filter({parentElement: this.element, filterHolder: this, initial: true, initialType: this.initialType});
	if(this.saved) { // reconstruct from request object.
	    this.initialFilter.recreateFilter(this.saved);
	}
	this.updateSummary();

	this.activate(); // the most recently opened one should be the active one.

	this.toggle.observe('click', this.handleToggle.bind(this));
    },
    strokeColor: function() {
	return this.color.map(function(color) {return Math.round(Math.pow(color/255,6)*255);});
    },
    remove: function() {
	delete this.filterSlider.filterHolders[this.place];
	this.filterSlider.filterHolders = this.filterSlider.filterHolders.compact();
	this.element.remove();
//	this.filterSlider.
//	window.console.log(this.filterSlider.filterHolders.pluck('summary').pluck('innerHTML'));
//	this.toggle.stopObserving('click');
	this.toggleContainer.remove();
//	window.console.log(filterHolders);
	this.filterSlider.filterHolders.each(function(fH) {
	    fH.updateTogglePosition();
	});
    },
    updateTogglePosition: function() {
	var offset = 0;
//	offset += this.filterSlider.element.viewportOffset().top;


	for(var i = this.place-1; i >= 0; i--) {
	    if(!this.filterSlider.filterHolders[i]) { continue; } // removed elements would result in this not being here.
	    offset += this.filterSlider.filterHolders[i].toggleContainer.getHeight() + 3;
	}
	this.toggleContainer.setStyle({
//	    left: this.filterSlider.element.viewportOffset().left 
	    top: offset + 'px'
	});
    },
    activate: function() { // raise the Z on the main section to make it visible.
	this.active = true;
	this.filterSlider.activeFilterHolder = this;
	this.element.addClassName('active');
	this.toggleContainer.addClassName('active'); // bring it in front of sliderfill's shadow.
//	for (var id in filterHolders) { // deactivate other filter holders
	this.filterSlider.filterHolders.each(function(filterHolder, place) {
	    if(place == this.place) { return; }
	    this.filterSlider.filterHolders[place].deactivate();
	}.bind(this));
    },
    deactivate: function() {
	this.active = false;
	this.element.removeClassName('active');
	this.toggleContainer.removeClassName('active');
    },
    handleToggle: function(event) { // either toggle (if we're already selected) or switch on (if we're not)
	if(this.active) {
	    toggleSlider(event); // global function whee
	} else {
	    this.activate();
	    if(!this.filterSlider.element.hasClassName('out')) {
		toggleSlider(event);
	    }
	}
    },
    updateSummary: function() { // pull the summaries from all the individual filters.
	function extractSummary(filter, summaryText) { // recursively extract summaries.
	    if(!filter) { return; }
	    if(!filter.summary) { return; }
	    summaryText += filter.summary.innerHTML;

	    var thenSummaries = [];
	    filter.thenHolder.childElements().each(function(thenFilter) {
		thenSummaries.push(extractSummary(filters[thenFilter.identify()], ''));
	    });
	    if(thenSummaries.size() > 0) {
		summaryText += ', then ' + thenSummaries.join(', and also ');
	    }
	    return summaryText;
	}
	this.summary.update(extractSummary(this.initialFilter, ''));

	this.filterSlider.filterHolders.each(function(filterHolder) {
	    filterHolder.updateTogglePosition(); // have to update toggle positions after update summaries, as this will offset the toggles
	});
	this.filterSlider.filtersModified(); // possibly enable the redraw button.

//	this.toggle.update(.update(this.summary)); // only update the chart toggle upon redraw
    }
});

var FilterSlider = Class.create();
Object.extend(FilterSlider.prototype, {
//    proColor: '#0000ff', // these are not currently plugged into the graphing operation.
//    conColor: '#ff0000',
    initialize: function(options) {
	this.redrawButton =  $('redraw');

	this.filterHolders = [];

	this.sliderFill = new Element('div', {className: 'sliderFill left top right bottom'});
	this.element = new Element('div', {className: 'slider active left out filterSlider'});
	this.element.insert(this.sliderFill);

	this.chartToggle = new Element('span', {className: 'toggle pressable'});
	$$('#chartSlider div.togglecontainer').first().insert(this.chartToggle);

	$$('body').first().insert(this.element);

	this.id = this.element.identify();
	filterSliders[this.id] = this; // this object has to be set for initial filters to be created successfully.

//	this.filterHolders = [
	new FilterHolder({filterSlider: this, initialType: 'purchase'});
	new FilterHolder({filterSlider: this, initialType: 'mortgage'});
//	];

	$H(filterSliders).values().invoke('deactivate');
	this.activate();

	// Empower the chart toggles

	this.chartToggle.observe('click', toggleSlider);
	
	// update the summary
	this.updateChartSummary();
	this.enableRedraw();
	this.draw(); // auto-draw
    },
    activate: function() {
	this.active = true;
    },
    deactivate: function() {
	this.active = false;
    },
    filtersModified: function() { // handle the fact that component filters have been modified.
//	this.updateSummary();
//	this.request.dates = primaryValues.dateRange;
	if(!this.request) {
	    this.enableRedraw();
	    return;
	}
	this.disableRedraw();
//	if(this.drawnProSummary == this.proSummary && this.drawnConSummary == this.conSummary && this.request.dates[0] == primaryValues.dateRange[0] && this.request.dates[1] == primaryValues.dateRange[1]) { // what would be drawn is same as before -- disable the redraw button.
	this.drawnSummaries.each(function(drawnSummary, index) {
	    if(this.filterHolders[index].summary.innerHTML != this.drawnSummaries[index] || primaryValues.dateRange[0] != this.request.dates[0] || primaryValues.dateRange[1] != this.request.dates[1]) {
		this.enableRedraw();
	    }
	}.bind(this));
    },
    disableRedraw: function() {
//	return; // temporary for easier debugging.

	this.allowRedraw = false;
	disableButton(this.redrawButton);
    },
    enableRedraw: function() {
	this.allowRedraw = true;
//	enableButton(this.redrawButton);
	flashButton(this.redrawButton);
    },
    updateChartSummary: function() { // update the combined summary on the chart -- call this when we redraw the entire filterslider set.
//	if(!this.initialProFilter || !this.initialConFilter) { return false; } // prevent premature execution
//	var summaries = [];
	this.chartToggle.update('');
	this.filterHolders.each(function(filterHolder, index) {
	    this.chartToggle.insert(new Element('span', {className: 'summary'})
				    .setStyle({background: filterHolder.summary.getStyle('background'), borderColor: filterHolder.summary.getStyle('borderColor')})
				    .update(filterHolder.summary.innerHTML));
	    if(index +1 < this.filterHolders.size()) {
		this.chartToggle.insert(new Element('span', {className: 'vs'}).update('vs.'));
	    }
	}.bind(this));
	var dateRange = function() { return new Element('span', {className: 'vs'}).update(' ' + prettyDateRange()); };
	this.chartToggle.insert(dateRange()); // only update the chart toggle with summary when we actually draw

	var chartToggleHeight = this.chartToggle.getHeight();
	$$('#chartSlider div.togglecontainer').first().setStyle({top: Number(0 - chartToggleHeight) + 'px'});
//	this.toggle.update(summaryText);


//	this.chartToggle.update('<span class="graphKey" style="background:' + this.proColor + '">&nbsp;</span>' + summaryText + '<span class="graphKey" style="background:' + this.conColor + '">&nbsp;</span>');
    },
    setFinalFilter: function(finalFilterName, finalFilter) {
	this[finalFilterName] = finalFilter;
    },
    draw: function(options) { // Make request for a new map and graph.
	options = options ? options : {};
//	window.console.log(this.allowRedraw);
	if(!this.allowRedraw && !options.zooming && !options.panning) { return; } // kill if it's the same as before or if we're not panning/zooming at a close level.

	closeInfoWindow(); // close the old info window.
	this.disableRedraw(); // disable the redraw while we're loading.

	this.drawnSummaries = [];
	this.request = {};
	this.request.filter = [];
	this.filterHolders.each(function(filterHolder, index) {
	    filterHolderName = this.filterHolders[index].summary.innerHTML;
	    this.drawnSummaries[index] = filterHolderName;
	    var filterHolderRequest = filterHolder.initialFilter.processFilter('', this.setFinalFilter.curry(filterHolder.id).bind(this));
//	    window.console.log(filterHolder.initialFilter);
//	    window.console.log(filterHolderRequest);
	    filterHolderRequest.name = filterHolderName; // add on the extra filterHolder attribues.
	    filterHolderRequest.color = this.filterHolders[index].color;
/*	    if(!filterHolderRequest.dataType) {
		if(filterHolderRequest.lotValues) {
		    if(filterHolderRequest.lotValues.dataType) {
			filterHolderRequest.dataType = filterHolderRequest.lotValues.dataType;
			delete filterHolderRequest.lotValues.dataType;
		    }
		}
		filterHolderRequest.dataType = 'sumSum';
	    }*/
//	    filterHolderRequest.dataType = 'sumNumber';
//	    filterHolderRequest.dataType = 'sumDollar';
	    this.request.filter.push(filterHolderRequest);
	}.bind(this));

	this.request.filter.each(function(filterRequest) {
	    filterRequest.dataType = 'sumSum';
	    if(filterRequest.lotValues) {
		if(filterRequest.lotValues.dataType) {
		    filterRequest.dataType = filterRequest.lotValues.dataType[0];
		    delete filterRequest.lotValues.dataType;
		}
	    }
	}.bind(this));

	window.console.log(this.request);

	this.request.zoom = zoomType;
	if(this.request.zoom == 'tract') {
	    this.request.view = obtainViewBounds();
	}
//	window.console.log('updating date values');
	this.request.dates = primaryValues.dateRange.clone();
	this.prevRequest = this.request;
	this.requestJSON = $H(this.request).toJSON();


	this.updateChartSummary();
	
	createMapAndGraph(this.requestJSON); // this starts the gears churning on actually making it

	this.requestOverlay(this.requestJSON); // this waits until it's ready.
	this.requestGraph(this.requestJSON, {supplemental: false}); // ditto
    },
//    drawSubBoroughGraph: function(subBorough) { // Add the subborough graph onto the existing one.
    drawSupplement: function(supplementId, supplementName, supplementType) {
	if(!this.prevRequest) { return; } // draw the local graph after what's on the map already, ignore if the user made any changes after.
	var supplementRequest = this.prevRequest;
	supplementRequest.zoom = zoomType; // tract views require view boundaries, and we're not worried about the map, just the graph.
//	if(!supplementRequest.proFilter.lotValues) { supplementRequest.proFilter.lotValues = {}; };
//	if(!supplementRequest.conFilter.lotValues) { supplementRequest.conFilter.lotValues = {}; };
//	    filterHolderRequest.dataType = 'sumSum';

/*	for(f in supplementRequest.filter) {
	    if(!supplementRequest.filter[f].lotValues) { supplementRequest.filter[f].lotValues = {}; }
	    supplementRequest.filter[f].dataType = 'sumSum';
	}*/
/*	supplementRequest.filter.each(function(filterRequest) {
	    filterRequest.dataType = 'sumSum';
	    window.console.log(supplementRequest);
	    if(filterRequest.lotValues) {
		if(filterRequest.lotValues.dataType) {
		    filterRequest.dataType = filterRequest.lotValues.dataType[0];
		    delete filterRequest.lotValues.dataType;
		}
	    }
	});*/


	if(supplementType == 'subborough') {
//	    for(f in supplementRequest.filter) {
	    supplementRequest.filter.each(function(filterRequest) {
//		window.console.log(filterRequest);
		if(!filterRequest.lotValues) {
		    filterRequest.lotValues = {};
		}
		filterRequest.lotValues.subborough = [supplementId];
	    });
//	    }
	}
	supplementRequest.supplemental = 1;

	window.console.log(supplementRequest);

	var supplementRequestJSON = $H(supplementRequest).toJSON();
	createMapAndGraph(supplementRequestJSON);
	this.requestGraph(supplementRequestJSON, {supplemental: true, supplementName: supplementName});
	this.requestPieChart(supplementRequestJSON, {supplemental: true, supplementName: supplementName});
    },
    remove: function() {
	delete filterSliders[this.id];
	this.element.remove();
    },
    requestOverlay: function(request) { // Will return the URL of the map, once it exists (which may be immediately).
	elementBusy($('map'), "Calculating map...");
	new Ajax.Request("/cgi-bin/geogrape/requestMap.pl", {
	    method: 'get',
	    parameters: {
		requestJSON: request
	    },
	    onSuccess: function(transport) {
		elementUnbusy($('map'));
		window.console.log('requestMap.pl responseText: ' + transport.responseText);
		this.makeOverlay(transport.responseText);
	    }.bind(this)
	});
    },
    requestPieChart: function(request, options) {
	options = (options)? options: {};
	
	updateInfoWindow([new GInfoWindowTab('', busyDiv('Loading involved parties in ' + options.supplementName))]);
//	if(!options.infoWindow) { return; } // only request a pie chart if there's somewhere to put it.
	new Ajax.Request("/cgi-bin/geogrape/requestPieChart.pl", {
	    method: 'get',
	    parameters: {
		requestJSON: request
	    },
	    onSuccess: function(transport) {
//		window.console.log(transport.responseText);
		var pieChartData = $A(transport.responseText.evalJSON());
		var infoWindowTabs = [];
		for(pieChartType in pieChartData[0]) {  // we have to look inside proCHart or conChart to get an idea of the types.
		    infoWindowTabs.unshift(
			new GInfoWindowTab(
			    pieChartType, pieChartData.inject(new Element('div', {id: pieChartType + 'PieCharts', className: 'pieChartContainer'}), // this will create one pieChart per outer wrappe (pro/con)
							      function(containerDiv, pieChart, index) {
								  var prefix = "pieChart" + index;
//								  var innerContainer = new Element('div', {className: prefix + 'Container'});
								  var innerContainer = new Element('div', {className: 'pieChartInnerContainer'});
								  innerContainer.insert(new Element('div', {id: prefix + '_' + pieChartType + '_summary', className: prefix + 'Summary'}));
								  innerContainer.insert(new Element('div', {id: prefix + '_' + pieChartType, className: 'pieChart'}));
								  innerContainer.insert(new Element('div', {id: prefix + '_' + pieChartType + '_key', className: 'pieChartKey'}));
								  containerDiv.insert(innerContainer);
								  return containerDiv;
							      }
							     )
			)
		    );
		}
		updateInfoWindow(infoWindowTabs); // have to add the divs to contain charts before hand.
		pieChartData.each(function(pieChart, index) {
//		    var proOrCon = pair.key;
		    var prefix = "pieChart" + index;

		    $H(pieChart).each(function(individualPieChart) {
			var type = individualPieChart.key;
//			if(type == 'correlation') { return; } // correlations are not pie-charted right now.
			var data = individualPieChart.value;
			var total = data.pluck('data').pluck('0').pluck('1').inject(0, function(max, value) { max += value; return max; } ); // add up every slice.

			var element = $(prefix + '_' + type);
			var pieChartInnerContainer = element.up('.pieChartInnerContainer');
			var assocFilterHolder = this.filterHolders[index];
			pieChartInnerContainer.setStyle({
			    background: '#' + assocFilterHolder.color.invoke('toColorPart').join(''),
			    borderColor: '#' + assocFilterHolder.strokeColor().invoke('toColorPart').join('')
			});
			var legendElement = prefix + '_' + type + '_key';
			var summaryElement = $(prefix + '_' + type + '_summary');
//			summaryElement.update(total + ' ' + /* + 'Summary'] + ' ' + prettyDateRange());
			summaryElement.update(total + ' ' + prettyDateRange());
			var pieChart = new Proto.Chart(
			    element,
			    data,
			    {pies: {show: true, autoScale: true}, legend: {
				show: true,
				container: legendElement,
				labelFormatter: function (label, value) {
				    return label + ': ' + value;
				}
			    }}
			);
		    }.bind(this));
		}.bind(this));
	    }.bind(this)
	});
    },
    requestGraph: function(request, options) {


	options = (options)? options : {};
	if(options.supplementName) {
	    var loadingText = 'Loading supplementary graph for ' + options.supplementName;
	} else {
	    var loadingText = 'Loading graph';
	}
	elementBusy($('chartSlider'), loadingText);

	new Ajax.Request("/cgi-bin/geogrape/requestGraph.pl", {
	    method: 'get',
	    parameters: {
		requestJSON: request
	    },
	    onSuccess: function(transport) {
		var newGraphData = transport.responseText.evalJSON();
		elementUnbusy($('chartSlider'));
		if(options.supplemental) {
		    makeGraph(newGraphData, options);
		} else {
		    this.graphData = makeGraph(newGraphData, options);
		}
	    }.bind(this)
	});
    },
    makeOverlay: function(mapLocalURI) {
	if (GBrowserIsCompatible()) {
	    if(map) {
		elementBusy($('map'), "Downloading map...");
		if(this.cityOverlay) {
		    map.removeOverlay(this.cityOverlay); // replace the existing overlay if it already exists
		}
		var overlayUrl = "http://thisoldmac.cuit.columbia.edu/" + mapLocalURI +'?' + (new Date).getTime();
		this.cityOverlay = new GGeoXml(overlayUrl);
		map.addOverlay(this.cityOverlay);
		GEvent.addListener(this.cityOverlay, 'load', function() {
		    elementUnbusy($('map'));
		}.bind(this));

	    }
	}
    }

});

var makeGraph = function(newGraphData, options) {
    if(options.supplemental) { // don't eliminate old graph data for supplemental graph, but do supplant old supplemental data.
	if(!showSupplemental) { return; } // the request was killed in the interim.
	delete chartData[2];
	delete chartData[3];
	chartData[2] = {};
	chartData[3] = {};
	
	chartData[2] = newGraphData[0];
	chartData[2].supplemental = true;
	chartData[2].filter = 'pro';
	chartData[2].color = "#0000AA";
	chartData[2].shadowSize = .5;

	chartData[3] = newGraphData[1];
	chartData[3].supplemental = true;
	chartData[3].filter = 'con';
	chartData[3].color = "#AA0000";
	chartData[3].shadowSize = .5;
    } else {
	delete chartData[0];
	delete chartData[1];
	chartData = [newGraphData[0], newGraphData[1]];
    }
    chartData[0].filter = 'pro';
    chartData[0].color = "#0000ff";
    chartData[0].lines = {};
    chartData[0].lines.lineWidth = 1;
    chartData[0].lines.fill = true;
    chartData[0].lines.fillColor = 'rgba(0,0,255,.5)';
    chartData[0].shadowSize = 0;
    chartData[1].filter = 'con';
    chartData[1].color = "#ff0000";
    chartData[1].lines = {};
    chartData[1].lines.lineWidth = 1;
    chartData[1].lines.fill = true;
    chartData[1].lines.fillCOlor = 'rgba(255,0,0,.5)';
    chartData[1].shadowSize = 0;

    drawGraph();
    return $H(chartData).clone();
}
var makeTable = function() {

    return '<p>meh</p>';
}

var removeSupplementalGraph = function() {
    delete chartData[2];
    delete chartData[3];
    drawGraph();
}

var yearMonthToYearFraction = function(yearMonth) { // the yearMonth format used for requests is no good for charts.
    var year = String(yearMonth).substr(0,4);
    var month = String(yearMonth).substr(4,2);
    return Number(year) + ((Number(month)-1) / 12);
};
var yearFractionToYearMonth = function(yearFraction) { // and the yearFraction format used for the charts is no good for requests.
    var year = String(yearFraction).substr(0,4);
    var fraction = Number(String(yearFraction).substr(4));
    var month = Math.floor(fraction*12) +1;
    if(month < 10) { month = '0' + month } // month must be two digits.
    return Number(year + String(month));
};
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var yearFractionToPrettyYearMonth = function(yearFraction) {
    var yearMonth = yearFractionToYearMonth(yearFraction);
    return yearMonthToPrettyYearMonth(yearMonth);
}
var yearMonthToPrettyYearMonth = function(yearMonth) {
    yearMonth = String(yearMonth);
    return months[Number(yearMonth.substr(4,2)) -1] + ' ' + yearMonth.substr(0,4);
}
var prettyDateRange = function() {
    if(primaryValues.dateRange[0] == primaryValues.dateRange[1]) {
	var prefix = 'on';
	return 'on ' + yearMonthToPrettyYearMonth(primaryValues.dateRange[0]);
    } else {
	return 'between ' + yearMonthToPrettyYearMonth(primaryValues.dateRange[0]) + ' and ' + yearMonthToPrettyYearMonth(primaryValues.dateRange[1]);
    }

}

var map;
//var subboroughs_base;
var subboroughPolys;
var geoXml;
var toggleState = 1;

var createMapAndGraph = function(request) { // Will start to create the graph and map, if they don't already exist.
    new Ajax.Request("/cgi-bin/geogrape/createMapAndGraph.pl", {
	method: 'get',
	parameters: {
	    requestJSON: request
	},
	onSuccess:function(transport) {
	    window.console.log("createMapAndGraph.pl responseText: " + transport.responseText);
	    var response = transport.responseText.evalJSON();
	    var ids = response.ids;
//	    window.console.log(ids);
//	    window.location.hash = ids.join('-');
	}
    });
};

var loadRequestForId = function(options) { // give an id or array of requests Ids, obtain an object with the requests, keyed by the hash ID. returns null for each response it was unable to correlate.
    options = (options) ? options : {};
    var params = {};
    if(options.ids) {
	ids = (typeof ids == 'object') ? ids : [ids];
	params = {idsJSON: ids.toJSON()};
    }
    new Ajax.Request("/cgi-bin/geogrape/loadRequestForId.pl", {
	method: 'get',
	parameters: params,
	onSuccess:function(transport) {
//	    window.console.log("loadRequestForId responseText: " + transport.responseText);
	    var response = transport.responseText.evalJSON();
	    if(options.saveTo) {
		options.saveTo.save(response);
	    }
//	    return response;
	}
    });
};

var SavedGeograpes = Class.create();
Object.extend(SavedGeograpes.prototype, {
    initialize: function() {
	this.update();
    },
    update: function() {
	loadRequestForId({saveTo: this});
    },
    save: function(retrievedGeograpes) {
	this.retrievedGeograpes = retrievedGeograpes;
//	window.console.log(this.retrievedGeograpes);
    },
    display: function(parent) { // display the loaded geograpes
//	window.console.log(this.retrievedGeograpes);
//	window.console.log(parent);
	if(!parent) { return; }
	parent.update(''); // clear it.
	if(this.retrievedGeograpes) {
//	    for(rG in this.retrievedGeograpes) {
	    for(rG in this.retrievedGeograpes) {
//		window.console.log(rG);
		parent.insert(new Element('div', {className: 'item'}).update(this.retrievedGeograpes[rG]));
	    }
	} else {

	}
    }
});
var savedGeograpes = new SavedGeograpes();

var redraw = function() {
    // find the current geogrape, redraw it.
    $H(filterSliders).values().find(function(filterSlider) { return (filterSlider.active == true); } ).draw();
}
var formatTracker = function(val) {
    return yearFractionToPrettyYearMonth(val.x) + ': ' + Math.floor(val.y);
}

// Chart stuff.
var options = {
    lines: { show: true},
    points: {show: false},
    grid: {clickable: true},
    legend: { noColumns: 4 },
    xaxis: {min: 1966, max: 2009, tickSize: 2},
    yaxis: {},
    selection: {mode: "x", color: '000000'}
    //    ,mouse: {track: true, fixedPosition: false, sensibility: 10, trackFormatter: formatTracker, trackDecimals: 3 }
};
var chartHolder; 
var drawGraph = function() {
    chart = new Proto.Chart(chartHolder, chartData, options);
    // preserve the start and end ranges upon resize by recalling it from the requests.
    syncChartSelectionToDateRange();
}
var syncChartSelectionToDateRange = function() {
    setChartSelectionByFraction(yearMonthToYearFraction(primaryValues.dateRange[0]), yearMonthToYearFraction(primaryValues.dateRange[1]));
}
var setChartSelectionByFraction = function(startYearFraction, endYearFraction) {
    // always add one month to the end value, as our range is inclusive (ie 200801, 200801 includes all of Jan, so draw to February)
//    window.console.log('a');
//    window.console.log('start: ' + startYearFraction + ', end: ' + endYearFraction);
    endYearFraction += primaryValues.minDateRange;
    chart.setSelection({x1: startYearFraction, x2: endYearFraction});
}
var limitGraphRedraw = false; // to prevent lots of redraws.
var limitGraphRedrawTimeout = 200; // fifth of a second between redraws.
var redrawGraph = function() {
    if(!limitGraphRedraw) {
	drawGraph();
    } 
}
var activeFilterSlider = function() {
    return filterSliders[$$('.filterSlider.active').first().identify()];
}
var hideSubboroughs = function() {
    subboroughPolys.each(function(subboroughPoly) {
	subboroughPoly.hide();
    });
}
var showSubboroughs = function() {
    subboroughPolys.each(function(subboroughPoly) {
	subboroughPoly.show();
    });
}
var mapZoomed = function(oldLevel, newLevel) { // 11 is first zoom, goes up to 18
    if(newLevel > 14) {
	hideSubboroughs();
//	subboroughs_base.hide();
	map.setMapType(G_HYBRID_MAP);
    } else {
	showSubboroughs();
//	subboroughs_base.show();
	map.setMapType(G_PHYSICAL_MAP);
    }
    if(newLevel > 15 && oldLevel <= 15) { // cut off for tract/city zooming
//	window.console.log('crossed threshold');
	zoomType = 'tract';
	activeFilterSlider().draw({zooming: true});
    } else if(newLevel <= 15 && oldLevel > 15) {
	zoomType = 'city';
	activeFilterSlider().draw({zooming: true});
    }
}
var mapMoved = function() {
//    window.console.log(map.getBounds());
//    var viewBounds = map.getBounds();
    if(zoomType == 'tract') {
	activeFilterSlider().draw({panning: true});
    }
}
var toMercator = function(lonLat) {
    /* spherical mercator for Google, VE, Yahoo etc
             * epsg:900913 R= 6378137 
             * x = longitude
             * y= R*ln(tan(pi/4 + latitude/2)
             */
    var lon = lonLat.x;
    var lat = lonLat.y;
    lon = 6378137.0 * Math.PI / 180 * lon;
    lat = 6378137.0 * Math.log(Math.tan(Math.PI/180*(45+lat/2.0)));
    return({lon: lon, lat: lat});
//    window.console.log('lon: ' + lon + ', lat: ' + lat);
}
var obtainViewBounds = function() {
//    window.console.log(map.getBounds());
//    window.console.log(map.getBounds().getNorthEast().x*6378137);
//    window.console.log(map.getBounds().getSouthWest().x*6378137);
//    toMercator(map.getBounds().getNorthEast());
    var neLonLat = toMercator(map.getBounds().getNorthEast());
    var swLonLat = toMercator(map.getBounds().getSouthWest());
    var west = swLonLat.lon;
    var north = neLonLat.lat;
    var east = neLonLat.lon;
    var south = swLonLat.lat;
//    return([west, north, east, south]);
    return([east, south, west, north]);
}

var closeInfoWindow = function(content) {
    if(map) {
	map.closeInfoWindow();
    }
}
var updateInfoWindow = function(content) { // content may be an area of tabs
    map.updateInfoWindow(content);
}

// these functions take buttons and either turn them off (make them not clickable,) make them clickable, or make them 'urgently' clickable.  takes the dom element as argument.
var disableButton = function(button) {
    if(!button.hasClassName('button')) {return;}
    stopFlashingElement(button);
    button.removeClassName('pressable');
    button.addClassName('disabled');
}
var enableButton = function(button) {
    if(!button.hasClassName('button')) {return;}
    button.removeClassName('disabled');
    button.addClassName('pressable');
}
var flashButton = function(button) {
    if(!button.hasClassName('button')) {return;}
    enableButton(button);
    flashElement(button);
}
var flashElement = function(element) { // will reduce all components of the background color except red to 0 over a time frame, thus flashing it red (or black, if it had no red component)
    if(element.hasClassName('flashing')) { return; } // already flashing, kill it.
    element.addClassName('flashing');

    var flashing = setInterval(function() {
	var rgbArray = element.getStyle('background-color').rgbToArray();
	var green = element.getAttribute('green') ? element.getAttribute('green') : element.setAttribute('green', 'decrease');
	var blue = element.getAttribute('blue') ? element.getAttribute('blue') : element.setAttribute('blue', 'decrease');
	if(rgbArray[1] > 20) {
	    rgbArray[1] -= 20;
	} else if(rgbArray[1] < 230) {
	    rgbArray[1] += 20;
	}
	if(rgbArray[2] > 20) {
	    rgbArray[2] -= 20;
	} else if(rgbArray[2] < 230) {
	    rgbArray[2] += 20;
	}


	this.setStyle({backgroundColor: '#' + rgbArray.invoke('toColorPart').join('')});
	if(!this.hasClassName('flashing')) { clearInterval(flashing); }

    }.bind(element), 100);
}
var stopFlashingElement = function(element) {
    element.removeClassName('flashing');
}
var elementBusy = function(element, text) {
    element.insert(busyDiv(text));
}
var elementUnbusy = function(element) {
    element.select('.busy').invoke('remove');
}
var busyDiv = function(text) {
    text = text ? text : 'Loading';
    var img = new Element('img', {src: 'img/load.gif'});
    var textDiv = new Element('span').update(text + '...').insert(img);
/*    setInterval(function() {
	textDiv.update(textDiv.innerHTML + '.');
    },100);*/
    return new Element('div', {className: 'busy'}).insert(new Element('div', {className: 'top bottom left right mask'}).setOpacity(.5)).insert(textDiv);
}
// Instances
Event.observe(window, 'load', function() {
    // main controls section
    var mainControlsButtons = [
	{name: 'about', observers: {}},
	{name: 'blog', observers: {}},
	{name: 'load a geogrape', observers: {
	    mouseenter: function() {
		savedGeograpes.update();
		savedGeograpes.display(this.down('.menu'));
		this.down('.menu').select('.item').invoke('observe', 'click',
							  function() {
//							      window.console.log($H(filterSliders).values().first().activeFilterHolder);
							      $H(filterSliders).values().first().activeFilterHolder.remove();
							      var savedFilterHolder = new FilterHolder({filterSlider: $H(filterSliders).values().first(), saved: this.innerHTML.evalJSON()});
							  }
							 );
		this.down('.menu').show();
	    },
	    mouseleave: function() {
		this.down('.menu').hide();
	    }
	},
	 content: new Element('div', {className: 'menu'}).hide()},
	{name: 'save this geogrape', observers: {}},
	{name: 'redraw',  observers: {click: redraw}},
    ];

    var mainControls = $('mainControls');
    mainControlsButtons.each(function(mainControlButton) {
	var mainControlElement = new Element('span', {id: mainControlButton.name.gsub(' ', '_'), className: 'button pressable'}).update(mainControlButton.name);
	mainControls.insert(mainControlElement);

	if(mainControlButton.style) 
	    mainControlElement.setStyle(mainControlButton.style);
	if(mainControlButton.content)
	    mainControlElement.insert(mainControlButton.content);
	
	for(o in mainControlButton.observers) {
	    mainControlElement.observe(o, mainControlButton.observers[o]);
	}
    });

    new FilterSlider(); // must be made after the buttons are added to the page, because the initialization expects to be able to link to these buttons.

    // Empower the sliders in the chart
//    $$('div#chartSlider div.togglecontainer span.toggle').invoke('observe', 'click', toggleSlider);

    chartHolder = $('chartHolder');
    chartHolder.observe("ProtoChart:plotclick", function(event) { // make a single click select an individual month.
	var pos = event.memo[0];
	
	primaryValues.dateRange[0] = yearFractionToYearMonth(pos.x);
	primaryValues.dateRange[1] = yearFractionToYearMonth(pos.x); // a one month range is inclusive -- thus the same value for both.
	syncChartSelectionToDateRange();
    });
    chartHolder.observe("ProtoChart:mouseup", function(event) {
	syncChartSelectionToDateRange();
    });
    chartHolder.observe("ProtoChart:selected", function(event) { // sync the chart selection with the dateRange component.
	var area = event.memo[0];

	if(area.x2 < area.x1) { // make sure these are in the right order
	    var switchvals = area.x2;
	    area.x2 = area.x1;
	    area.x1 = switchvals;
	}

	primaryValues.dateRange[0] = yearFractionToYearMonth(area.x1); // keep start and end range for requests in sync with map.
	// make sure there is at least one month selected.  if there is not, artificially ensure such a difference.
	//	    window.console.log("x2: " + area.x2 + ", x1: " + area.x1);
	if(area.x2 - area.x1 < primaryValues.minDateRange) {
	    area.x2 = area.x1;
	    primaryValues.dateRange[1] = primaryValues.dateRange[0];
	} else if(area.x2 - area.x1 > primaryValues.maxDateRange) {
	    primaryValues.dateRange[1] = yearFractionToYearMonth(area.x1 + primaryValues.maxDateRange);
	} else {
	    primaryValues.dateRange[1] = yearFractionToYearMonth(area.x2);
	}

	if(!limitGraphRedraw) { // this event fires on every resize of window (!), so limit that.
	    limitGraphRedraw = true;
	    var permitChartRedraw= function() { limitGraphRedraw = false; }
	    setTimeout(permitChartRedraw, limitGraphRedrawTimeout);
	    syncChartSelectionToDateRange();
//	    setChartSelectionByFraction(area.x1, area.x2); // force chart back in sync.
	    //	filterSliders[$$('.filterSlider.active').first().identify()].updateSummary();
	    //	window.console.log('change through chart');
	    filterSliders[$$('.filterSlider.active').first().identify()].filtersModified();
	}
    });
    Event.observe(window, 'resize', redrawGraph);
    // Set the default date range values.
    drawGraph();

    map = new GMap2(document.getElementById("map_canvas")); 
    map.setMapType(G_PHYSICAL_MAP);
    map.setCenter(new GLatLng(40.745176490485022,-73.937261107734685),11);

    subboroughPolys = addSubboroughs(map);
    subboroughPolys.each(function(subboroughPoly) { // observe the special 'selected' event, which is set up in subboroughs_json.js
	GEvent.addListener(subboroughPoly, 'click', function() {
	    var windowLonLat = this.getBounds().getCenter();
//	    var windowLonLat = this.getVertex(0);
	    infoWindow = map.openInfoWindowTabs(windowLonLat); // have to manually open infoWindow, assign it to global infoWindow object.
	    showSupplemental = true;
	    filterSliders[$$('.filterSlider.active').first().identify()].drawSupplement(this.geograpePolyId, this.geograpePolyName, 'subborough');
	});
    });

//    subboroughs_base = new GGeoXml("http://thisoldmac.cuit.columbia.edu/~john/nycgeogrape3/overlays/subboroughs-base.kmz");
//    map.addOverlay(subboroughs_base);

//    map.setUIToDefault();
    var zoomControl = new GLargeMapControl();
    map.addControl(zoomControl, new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(10,10)));

/*    GEvent.addListener(map, 'infowindowopen', function(event) {
	infoWindow = map.getInfoWindow();

	var infoWindowContent = infoWindow.getContentContainers().first();
	if(!subboroughs_base.isHidden()) {
	    var selectedSubborough = infoWindowContent.select('#iw_kml').first().innerHTML;
	    showSupplemental = true;
	    filterSliders[$$('.filterSlider.active').first().identify()].drawSupplement(selectedSubborough, 'subborough');
	}
    } );*/
    GEvent.addListener(map, 'infowindowclose', function(event) {
	showSupplemental = false; // if in progress, prevent it from displaying
	removeSupplementalGraph();
    });
    GEvent.addListener(map, 'zoomend', mapZoomed);
    GEvent.addListener(map, 'moveend', mapMoved);
//    draw(); // draw with the initial request settings.

});