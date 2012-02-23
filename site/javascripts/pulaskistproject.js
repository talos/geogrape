var cdNumberToName = {
	1: 'Financial District',
	2: 'Greenwich Village/Soho',
	3: 'Lower East Side/Chinatown',
	4: 'Clinton/Chelsea',
	5: 'Midtown',
	6: 'Stuyvesant Town/Turtle Bay',
	7: 'Upper West Side',
	8: 'Upper East Side',
	9: 'Morningside Heights/Hamilton Heights',
	10: 'Central Harlem',
	11: 'East Harlem',
	12: 'Washington Heights/Inwood',
	51: 'Mott Haven/Melrose',
	52: 'Hunts Point/Longwood',
	53: 'Morrisania/Crotona',
	54: 'Highbridge/Concourse',
	55: 'Fordham/University Heights',
	56: 'Belmont/East Tremont',
	57: 'Kingsbridge Heights/Bedford',
	58: 'Riverdale/Fieldston',
	59: 'Parkchester/Soundview',
	60: 'Throgs Neck/Co-op City',
	61: 'Morris Park/Bronxdale',
	62: 'Williamsbridge/Baychester',
	101: 'Greenpoint/Williamsburg',
	102: 'Fort Greene/Brooklyn Heights',
	103: 'Bedford Stuyvesant',
	104: 'Bushwick',
	105: 'East New York/Starrett City',
	106: 'Park Slope/Carroll Gardens',
	107: 'Sunset Park',
	108: 'Crown Heights/Prospect Heights',
	109: 'S. Crown Heights/Lefferts Gardens',
	110: 'Bay Ridge/Dyker Heights',
	111: 'Bensonhurst',
	112: 'Borough Park',
	113: 'Coney Island',
	114: 'Flatbush/Midwood',
	115: 'Sheepshead Bay',
	116: 'Brownsville',
	117: 'East Flatbush',
	118: 'Flatlands/Canarsie',
//	355: 'Prospect Park',
	151: 'Astoria',
	152: 'Woodside/Sunnyside',
	153: 'Jackson Heights',
	154: 'Elmhurst/Corona',
	155: 'Ridgewood/Maspeth',
	156: 'Rego Park/Forest Hills',
	157: 'Flushing/Whitestone',
	158: 'Hillcrest/Fresh Meadows',
	159: 'Kew Gardens/Woodhaven',
	160: 'S. Ozone Park/Howard Beach',
	161: 'Bayside/Little Neck',
	162: 'Jamaica/Hollis',
	163: 'Queens Village',
	164: 'Rockaway/Broad Channel'
/*	,201: 'St. George/Stapleton',
	202: 'South Beach/Willowbrook',
	203: 'Tottenville/Great Kills'*/
};

function copyObject(objectToCopy) {
	var copy = $H(objectToCopy).clone().toObject(); // if possible, use prototype's cloning technique & then make object 'normal' again
	if(!copy.length) {
		copy = objectToCopy; // if this yields nothing, make a link instead.
	}
	return copy;
}

function setMapCursor(cursorCSS) {
	$('map_OpenLayers_ViewPort').setStyle({
		cursor: cursorCSS
	});
}

// objects & functions to help represent property history.
function isSameParty(firstParty, secondParty) {
	firstParty = (firstParty.length > 5)? firstParty.substr(0,5) : firstParty;
	secondParty = (secondParty.length > 5)? secondParty.substr(0,5) : secondParty;
	if(firstParty.toUpperCase() == secondParty.toUpperCase()) {
		return true;
	} else {
		return false;
	}
}

var PropertyEvent = Class.create();
Object.extend(PropertyEvent.prototype,
	{
		initialize: function(options) {
			this.mapColumnValues(options.columnValues);
			this.address = options.address;
		},
		mapColumnValues: function(columnValues) { // for totalrecords returns.
			this.minisequence = options.columnValues[0];
			
		/*	this.districtid = options.columnValues[1];
			this.ct2000 = options.columnValues[2];
			this.geolot = options.columnValues[3];*/
			this.aptnumber = options.columnValues[4];
			
		//	this.year = options.columnValues[5];
			
			var dateArray = options.columnValues[6].split('-');
			this.year = dateArray[0];
			this.month = dateArray[1];
			this.day = dateArray[2];
			this.date = new Date(this.year, this.month, this.day);
			
			var paddedMinisequence = String('000' + this.minisequence);
			this.fullSequence = Number(dateArray.join('') +  paddedMinisequence.substring(paddedMinisequence.length - 4));
			
		/*	this.taxblock = options.columnValues[7];
			this.taxlot = options.columnValues[8];*/
			this.compressedid = options.columnValues[9];
			this.type = options.columnValues[10];
			this.amount = options.columnValues[11];
			this.divider = options.columnValues[12];
			this.party1 = options.columnValues[13];
			this.party2 = options.columnValues[14];
			this.party1info = options.columnValues[15];
			this.party2info = options.columnValues[16];
			this.info = options.columnValues[17];
		}
	}
);

var Mortgage = Class.create(PropertyEvent,
	{
		initialize: function($super, options) {
			$super(this);
			
			this.mortgagor = this.party1;
			this.originalMortgagee = this.party2;
			this.mortgagee = this.originalMortgagee;
			
			this.assignments = new Array();
			this.satisfaction = null;
			
			if(this.year < 1982) {
				this.needsSatisfaction = false;
				this.hasAmount = false;
			} else {
				this.needsSatisfaction = true;
				this.hasAmount = true;
			}
		},
		assign: function(mortgageAssignment) {
			if(this.aptnumber == mortgageAssignment.aptnumber) {
				if(isSameParty(this.mortgagee, mortgageAssignment.assignor)) {
					mortgageAssignment.parentMortgage = this;
					this.assignments.push(mortgageAssignment);
					this.mortgagee = mortgageAssignment.assignee;
				}
			}
		},
		satisfy: function(mortgageSatisfaction) {
			if(this.aptnumber == mortgageSatisfaction.aptnumber) {
				if(!this.satisfaction &&
					isSameParty(this.mortgagor, mortgageSatisfaction.mortgagor) &&
					(isSameParty(this.mortgagee, mortgageSatisfaction.mortgagee)) || isSameParty(this.originalMortgagee, mortgageSatisfaction.mortgagee))
				{
					mortgageSatisfaction.parentMortgage = this;
					this.satisfaction = mortgageSatisfaction;
				}
			}
		},
		textify: function() {
			var text = '';
			
			text += this.mortgagor + ' mortgaged ' + this.address + ' to ' + this.mortgagee;
			if(this.hasAmount) {
				text += ' for $' + this.amount;
			}
			text += ' on ' + this.date;
			
			return(text);
		}
	}
);
var MortgageAssignment = Class.create(PropertyEvent,
	{
		initialize: function($super, options) {
			$super(this);
			
			this.assignor = this.party1;
			this.assignee = this.party2;
			
			this.parentMortgage = null;
		},
		textify: function() {
			if(this.parentMortgage) {
				return null;
			} else {
				return 'Assignment of pre-1966 mortgage from ' + this.assignor + ' to ' + this.assignee;
			}
		}
	}
);
var MortgageSatisfaction = Class.create(PropertyEvent,
	{
		initialize: function($super, options) {
			$super(this);
			
			this.mortgagor = this.party1;
			this.mortgagee = this.party2;
			
			this.parentMortgage = null;
		},
		textify: function() {
			if(this.parentMortgage) {
				return null;
			} else {
				return 'Satisfaction of pre-1966 mortgage between ' + this.mortgagor + ' and ' + this.mortgagee;
			}
		}
	}
);

var IntroScreen = Class.create();
Object.extend(IntroScreen.prototype,
	{
		initialize: function(introScreenId, exitId) {
			
			this.element = $(introScreenId);
//			$('mask').setOpacity(.7);
			this.exit = $(exitId);
			
			this.exit.observe('click', function() {
				this.element.hide();
	//			$('mask').hide();
				theGraph.draw(); // not the most efficient way, but it works (to redraw the graph's title in right location)
			}.bind(this));
			
			$('guide_right').observe('mouseover', function() {
				$('guide_right').setStyle({
					fontWeight: 'bold',
					cursor: 'pointer'
				});
				$('rightcolumn').setStyle({
					zIndex: '10000'				
				});
				$('righthandcontrols').setStyle({
					border: '2px solid red',
					zIndex: '10000'
				});
			});
			$('guide_right').observe('mouseout', function() {
				$('guide_right').setStyle({
					fontWeight: 'normal',
					cursor: 'default'
				});
				$('rightcolumn').setStyle({
					zIndex: 1				
				});
				$('righthandcontrols').setStyle({
					border: '1px solid black',
					zIndex: 1
				});
			});
			
			
			$('guide_graph').observe('mouseover', function() {
				$('guide_graph').setStyle({
					fontWeight: 'bold',
					cursor: 'pointer'
				});
				$('graph').setStyle({
					border: '2px solid red',
					zIndex: '10000'
				});
			});
			$('guide_graph').observe('mouseout', function() {
				$('guide_graph').setStyle({
					fontWeight: 'normal',
					cursor: 'default'
				});
				$('graph').setStyle({
					border: '1px solid black',
					zIndex: 1
				});
			});
			
			$('guide_map_in').observe('mouseover', function() {
				$('guide_map_in').setStyle({
					fontWeight: 'bold',
				//	, cursor: 'url(img/magnipan.gif),pointer'
					cursor: 'pointer'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '2px solid red',
					zIndex: '10000'
				});
			});
			$('guide_map_in').observe('mouseout', function() {
				$('guide_map_in').setStyle({
					fontWeight: 'normal',
					cursor: 'default'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '1px solid black',
					zIndex: 1
				});
			});
			
			
			$('guide_map_out').observe('mouseover', function() {
				$('guide_map_out').setStyle({
					fontWeight: 'bold',
//					cursor: 'url(img/minipan.gif),move'
					cursor: 'move'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '2px solid red',
					zIndex: '10000'
				});
			});
			$('guide_map_out').observe('mouseout', function() {
				$('guide_map_out').setStyle({
					fontWeight: 'normal',
					cursor: 'default'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '1px solid black',
					zIndex: 1
				});
			});
			
			
			
			$('guide_map_pan').observe('mouseover', function() {
				$('guide_map_pan').setStyle({
					fontWeight: 'bold',
					cursor: 'move'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '2px solid red',
					zIndex: '10000'
				});
			});
			$('guide_map_pan').observe('mouseout', function() {
				$('guide_map_pan').setStyle({
					fontWeight: 'normal',
					cursor: 'default'
				});
				$('map_OpenLayers_ViewPort').setStyle({
					border: '1px solid black',
					zIndex: 1
				});
			});
		},
		allowExit: function() {
			this.exit.update('Page loaded, click here to begin.');
			this.exit.setStyle({
				cursor: 'pointer',
				fontSize: '16px'
			});
			this.exit.observe('mouseover', function() {
				this.exit.setStyle({
					fontWeight: 'bold'
				});
			}.bind(this));
			this.exit.observe('mouseout', function() {
				this.exit.setStyle({
					fontWeight: 'normal'
				});
			}.bind(this));
		}
	}
);

var Warning = Class.create();
Object.extend(Warning,
	{
		window: new Geogrape_Window({
			type: 'Modal',
			style: {
				left: '20%',
				right: '20%',
				top: '40%',
				textAlign: 'center'
			}
		}),
		open: function(problem) { // problem is a hash with the control, the problem, and the explanation
			this.isOpen = true;
			this.window.open();
			this.window.update(problem.why);
			this.control = problem.control;
			this.violation = problem.violation;
			this.optionNum = problem.optionNum;
			this.window.insert('<span id="reject">No</span><span id="approve">Yes</span>');
			$('approve').observe('click', function() {
				problem.control.approve();
			}.bind(this));
			$('reject').observe('click', function() {
				problem.control.reject();
			}.bind(this));
		},
		approve: function() { // user agrees to change parameters.
			this.window.update('');
			this.window.close();
			if(this.violation.type == 'year.start') {
				theControls.get('year').get('mapYear').changeYear(this.violation.year.start);
			} else if(this.violation.type == 'year.end') {
				theControls.get('year').get('mapYear').changeYear(this.violation.year.end);
			} else if(this.violation.type == 'features') {
				// waiting for implementation.
			}
			if(!this.optionNum) {
				this.control.select();
			} else {
				this.control.selectOptionNum(this.optionNum);
			}
			this.control = null;
			this.optionNum = null;
			this.isOpen = false;
		},
		reject: function() { // user refuses to change parameters
			this.window.update('');
			this.window.close();
			this.control = null;
			this.isOpen = false;
		}
	}
);

var Status = Class.create();
Object.extend(Status, // The class for status updates.  Creates its own window when necessary.
	{
		text: '',
		isFlashing: false,
		jobs: new Hash(),
		flasher: null,
		suppressed: false,
		window: new Geogrape_Window({
			type: 'Modal', // status bar updates will lock the screen.
			style: {
				left: '20%',
				right: '20%',
				top: '40%',
				textAlign: 'center'
			}
		}),
		set: function(jobName, newText) {
			this.jobs.set(jobName, newText);
			if(this.suppressed == false) {
				this.startFlashing();
				this.refresh();
			}
		},
		isBusy: function() {
			if(Warning.isOpen == true) { return true; } // a little cheap, but easy to work with existing code.
			if(this.jobs.size() > 0) {
				window.console.log('A request was killed by the Status.');
				return true; // set so that if there is -any- other job in progress, a signal is sent. Could be modified to prevent only duplicate clicks.
			}
		},
		clear: function(jobName) {
			this.jobs.unset(jobName);
			this.refresh();
		},
		refresh: function() {
			if(this.suppressed == false) {
				if(this.jobs.size() > 0) {
					//this.map.getControlsBy('title', 'Default').invoke('deactivate');
					
					this.window.open();
					this.window.update(this.jobs.values().join(', ') + '...');
					this.startFlashing();
				} else {
					this.endFlashing();
					//this.map.getControlsBy('title', 'Default').invoke('activate');
					
					this.window.update('');
					this.window.close();
				}
			}
		},
		startFlashing: function() {
			if(this.isFlashing == false) {
				this.isFlashing = true;

//				theGraph.setBusy();
       	//		OpenLayers.Element.addClass(this.map.viewPortDiv, "olCursorWait");
/*				var number = 0;
				var hitTop = false;
				this.flasher = setInterval(
					function() {
						$('mask').show();
						
						var stringNumber = number;
						if(stringNumber < 10) {
							stringNumber = '0' + stringNumber;
						}
						statusBarDiv.setStyle({
							background: '#FF' + stringNumber + stringNumber
						});
						$('mask').setOpacity(this.lastMaskOpacity);

						if(this.isFlashing ==  true) {
							if(hitTop) {
								number -= 8;
							} else {
								number += 8;
							}
							if(number > 74) {
								hitTop = true;
							}
							if(number < 8) {
								hitTop = false;
							}
							if(this.lastMaskOpacity < this.maskOpacity) {
								this.lastMaskOpacity += .1;
							}							
						} else { // gracefully end it
							if(number > 16) {
								number -= 16;
								this.lastMaskOpacity -= .1;					
							} else {
								if(this.flasher) {
									$('mask').hide();
									clearInterval(this.flasher);
								}
							}
						}
					}.bind(this), 50
				);*/
			}
		},
		endFlashing: function() {
	/*		if(this.isFlashing == true) {
				this.isFlashing = false;
				theGraph.clearBusy();
				setMapCursor('default');
			}*/
		},
		suppress: function() { // suppress the display of a busy status (as in animations... this will be reworked.)
			this.suppressed = true;
		},
		unsuppress: function() {
			this.suppressed = false;
		}
	}
);

// A hashLocation is a way of storing view settings without forcing reloads.
// The current settings are stored after the # in the URL.
var HashLocation = Class.create();
Object.extend(HashLocation.prototype,
	{
		initialize: function() {
			this.storedTypes = $A(['hilite', 'year', 'feature']); // these are the types we both storing in the url
		},
		add: function(control) { // Called when a control is added to theSelectedControls.
			if(this.storedTypes.find( function(storedType) { return storedType == control.type; } )) { // if this is a type we store
				var hashLocationHash = this.isolate(); // Yes, it's a hash for the hash location.
				if(theSelectedControls.get(control.type)) {
					if(theSelectedControls.get(control.type).get(control.id)) { // error checking.
						if(control.hasInput) {
							var value = control.input.getValue();
						} else if(control.year) {
							var value = control.year; // this is all a bit clumsy.
						} else {
							var value = 1; // Default 'enabled' value.
						}
						if(!hashLocationHash.get(control.type)) {
							hashLocationHash.set(control.type, {});
						}
						hashLocationHash.get(control.type)[control.id] = value; // This will ensure that a simple modification, which should call select, will update in the hash as well.
					}
				}
				window.location.hash = rison.encode(hashLocationHash.toObject()); // store in rison notation in the window's hash
			}
		},
		remove: function(control) { // Called when a control is removed from theSelectedControls.
			if(this.storedTypes.find( function(storedType) { return storedType == control.type; } )) {
				var hashLocationHash = this.isolate(); // Yes, it's a hash for the hash location.
				if(hashLocationHash.get(control.type)) {
					if(hashLocationHash.get(control.type).length == 1) {
						hashLocationHash.unset(control.type);
					} else {
						delete hashLocationHash.get(control.type)[control.id];
					}
				}
				window.location.hash = rison.encode(hashLocationHash.toObject()); // store in rison notation in the hash
			}
		},
		isolate: function() { // find the existing hash.
			var hashLocationString = window.location.hash;
			if(hashLocationString.substr(0,1) == '#') { // Eliminate the # if the browser included it, decode the URI.
				hashLocationString = decodeURI(hashLocationString.substr(1));
			}
			if(hashLocationString == '') {
				hashLocationString = '()';
			}
			var hashLocationHash = $H(rison.decode(hashLocationString));
			return hashLocationHash;
		},
		evaluate: function() {
			var hashLocationHash = this.isolate(); // Yes, it's a hash for the hash location.
			hashLocationHash.each(function(pair) { // each 'location' in the hash enables a hiliteControl.
				if(theControls.get(pair.key)) {
					for(hashKey in pair.value) {
						if(theControls.get(pair.key).get(hashKey)) {
							window.console.log(hashKey + ' in ' + pair.key);
							window.console.log(pair.value[hashKey]);
							if(theControls.get(pair.key).get(hashKey).hasInput) {
								theControls.get(pair.key).get(hashKey).setInput(pair.value[hashKey]); // this will only do something for those controls with actual input values.
							} else if(theControls.get(pair.key).get(hashKey).year) {
								theControls.get(pair.key).get(hashKey).year = pair.value[hashKey]; // this will only do something for those controls with actual input values.
							}
							theControls.get(pair.key).get(hashKey).select();
						}
					}
				}
			});
		},
	}
);

/*********************************** CONTROLS SECTION ***************************************/

var MyControl = Class.create();
Object.extend(MyControl.prototype,
	{
		isSelected: false,
		isHilited: false,
		type: null,
		id: null,
		initialize: function(options) {
			this.isRadio = options.isRadio;
			if(options.limits) {
				this.setLimits(limits);
			}
			if(!theControls.get(this.type)) { // first check to make sure this type is registered in the theControls.
				this.initializeType();
			}
			theControls.get(this.type).set(this.id, this);
			if(options.trueByDefault == true) {
				this.select();
			}
		},
		setLimits: function(limits) {
			// valid limits: var limits.year.start, var limits.year.end, array limits.features.types
			// also, var limits.year.why and limits.features.why
			this.limits = limits;
		},
		testLimits: function() {
			if(this.limits) {
				if(this.limits.year.start) {
					if(this.limits.year.start > theControls.get('year').get('mapYear').year) {
						Warning.open({control: this, violation:
							{
								type: 'year.start',
								year: this.limits.year.start
							},
						why: this.limits.year.why});
						return false;
					}
				}
				if(this.limits.year.end) {
					if(this.limits.year.end < theControls.get('year').get('mapYear').year) {
						Warning.open({control: this, violation:
							{
								type: 'year.end',
								year: this.limits.year.end
							},
						why: this.limits.year.why});
						return false;
					}
				}
				if(this.limits.feature.types) {
					for(featureType in this.limits.features.types) {
						if(theSelectedControls.get('feature').values()[0].featureType == featureType) {
							return true; // this must be the last thing checked for, could be invalidated by a later one.
						}
					}
					Warning.open({control: this, violation:
						{
							type: 'features',
							features: this.limits.features.types
						},
						why: this.limits.features.why
					});
					return false; // ran through the loop w/o finding it
				}
			}
			return true;
		},
		initializeType: function() {
			theControls.set(this.type, new Hash()); // we need a hash here to make the hiliting of dates & amounts happen quickly.
			theSelectedControls.set(this.type, new Hash());
			// don't set a hash inside theHilitedControls because only one can be hilited at a time (by definition).
			
			this.afterInitializeType();
		},
		afterInitializeType: function() { },
		remove: function() {
		//	this.unselect();
			this.afterRemove();
			
			// this will NOT unselect items -- thus it WILL leave orphans if a selected item had them (and they would have been cleared out by an unselect)
			theControls.get(this.type).unset(this.id);
			if(theSelectedControls.get(this.type).get(this.id)) {
				theSelectedControls.get(this.type).unset(this.id);
			}
			// will this object now be garbage collected? not sure.
		},
		afterRemove: function() { },
		click: function () {
			if(!this.testLimits()) { window.console.log('failed on testlimits'); return false; }
			if(this.isSelected == false) {
				this.select();
			} else {
				this.unselect();
			}
		},
		safeClick: function() { // unlike click(), only succeeds if Status is not busy.
			if(!Status.isBusy()) {
				this.click();
			}
		},
		unselectAllOfSameType: function() {
			theSelectedControls.get(this.type).values().invoke('unselect');
		},
		unselectAllOfSameTypeExceptThis: function() {
			theSelectedControls.get(this.type).each( function(pair) {
				if(pair.value.id != this.id) {
					pair.value.unselect();
				}
			}, this);
		},
		select: function() {
			if(!this.testLimits()) { window.console.log('failed on testlimits'); return false; }
			if(!this.isSelected) {
				if(this.isRadio) {
					this.unselectAllOfSameType();
				}
				theSelectedControls.get(this.type).set(this.id, this);
				this.isSelected = true;
			}
			hashLocation.add(this); // update of hash location is called for everything.
			this.afterSelect();
		},
		afterSelect: function() {},
		unselect: function() {
			if(this.isSelected) {
				theSelectedControls.get(this.type).unset(this.id);
				this.isSelected = false;
				hashLocation.remove(this);
				this.afterUnselect();
			}
		},
		afterUnselect: function() {},
		hilite: function() {
			if(!this.isHilited) {
				if(theHilitedControls.get(this.type)) {
					theHilitedControls.get(this.type).unhilite();
				}
				theHilitedControls.set(this.type, this);
				this.isHilited = true;
				this.afterHilite();
			}
		},
		afterHilite: function() {},
		unhilite: function() {
			if(this.isHilited) {
				theHilitedControls.set(this.type, null);
				this.isHilited = false;
				this.afterUnhilite();
			}
		},
		afterUnhilite: function() {}
	}
);

var MapYearControl = Class.create(MyControl, { // the selected year for map drawing
	initialize: function($super, defaultYear) {
		this.type = 'year';
		this.id = 'mapYear';
		this.year = defaultYear;
		$super({isRadio: false, trueByDefault: false});
	},
	changeYear: function(newYear) {
		if(this.year != newYear) {
			this.year = newYear;
			this.select();
			theSelectedControls.get('feature').values().invoke('updateChildData');
			theSelectedControls.get('hilite').values().invoke('updateDataForHilitedYear');
			theGraph.draw();
		}
	},
	nextYear: function() {
		this.changeYear(this.year + 1);
	}
});

var RightHandControl = Class.create(MyControl,
	{
		initialize: function($super, options) {
			this.type = options.type;
			this.id = options.id;
			this.name = String(options.name);
			this.descriptor = options.descriptor;
			this.window = options.window;
			this.colorArray = options.colorArray.clone();
			for(var i = 0; i < 3; i++) { // change options.colorArray to moderate text colors so they aren't as bright.
				options.colorArray[i] = (options.colorArray[i] > 175) ? 175 : options.colorArray[i];
			}
			this.color = '#' + options.colorArray.invoke('toColorPart').join('');			
			var isRadio = (options.isRadio)? true : false;
			this.hasInput = (this.name.indexOf('[input]') == -1)? false : true;
			this.multiOptions = (this.name.indexOf('[options:') == -1)? false : true;
			this.cannotBeSelected = options.cannotBeSelected;
			this.onSelect = options.onSelect;
			
			this.style = {
				'default': {
					cursor: 'pointer',
					zIndex: 30000,
					backgroundColor: '#fff',
					color: '#000',
					padding: '1px'
				},
				'hilite': {
					border: '1px solid red',
					padding: '0px'
				},
				'unhilite': {
					border: '',
					padding: '1px'
				},
				'select': {
					backgroundColor: '#000',
					color: this.color
				},
				'unselect': {
					backgroundColor: '#fff',
					color: '#000'
				}
			};
			
			if(this.hasInput) {
				this.name = this.name.replace('[input]', '<input size="10" type="text" id="' + this.id + '_input"/>');
//				this.click = function() { return; }; // have to mute 'click'
			}
			if(this.multiOptions) {
				var startOfOptions = this.name.indexOf('[options:');
				this.name = this.name.replace('[options:', '');
				var endOfOptions = this.name.indexOf(']', startOfOptions);
				this.name = this.name.replace(']', '');
				this.options = this.name.substring(startOfOptions, endOfOptions).split('|');
				
				var optionsText = '<span id="' + this.id + '_options"><span style="font-weight:bold;">' + this.options[0] + '</span></span>';
				
				this.name = this.name.substr(0, startOfOptions) + optionsText +  this.name.substr(endOfOptions);
			}
			
			this.window.insert('<div id="' + this.id + '"><span id="' + this.id + '_name"></span></div>');
			
			this.element = $(this.id);
			
			this.nameDiv = $(this.id + '_name');
			this.nameDiv.update(this.name);
			
			if(this.hasInput) {
				this.input = $(this.id + '_input');
				this.input.observe('keypress',
					function(event) {
						if(event.keyCode == Event.KEY_RETURN) {
							this.submit();
						}
					}.bind(this)
				);
				this.input.observe('click',
					function(event) {
						Event.stop(event); // stop the element events from triggering.
					}.bind(this)
				);
				this.element.observe('click', function(event) {
					if(this.input.getValue() == '') {
						this.input.focus();
					}
				}.bind(this));
			}
			
			this.element.observe('mouseover', this.hilite.bind(this));
			this.element.observe('mouseout', this.unhilite.bind(this));
			
			this.selectedOptionNum = 0;
			if(this.multiOptions) {
				this.optionsDiv = $(this.id + '_options');
				
				var optionsMenuText = '<div id="' + this.id + '_optionsMenu"></div>';
				this.optionsDiv.insert(optionsMenuText);
				
				this.optionsMenuDiv = $(this.id + '_optionsMenu');
				this.optionsMenuDiv.setStyle({
					position: 'absolute',
					display: 'none'
				});
				
				var optionNum = 0;
				this.options.each(function(option) {
					var thisOptionNum = optionNum;
					
					this.optionsMenuDiv.insert('<div id="' + this.id + '_options_' + thisOptionNum + '">' + option + '</div>');
					this.options[thisOptionNum] = $(this.id + '_options_' + thisOptionNum);
					this.options[thisOptionNum].setStyle({
						position: 'relative',
						background: 'white',
						border: '1px solid black'
					});
					this.options[thisOptionNum].observe('mouseover', function() {
						this.options[thisOptionNum].setStyle({
							border: '1px solid red'
						});
					}.bind(this));
					this.options[thisOptionNum].observe('mouseout', function() {
						this.options[thisOptionNum].setStyle({
							border: '1px solid black'
						});
					}.bind(this));
					this.options[thisOptionNum].observe('click', function(event) {
						this.options.each(function(optionDiv) {
							optionDiv.show();
						}.bind(this));
						this.selectOptionNum(thisOptionNum);
						
						this.options[thisOptionNum].hide();
						this.optionsDiv.firstDescendant().update(option);
						Event.stop(event);
					}.bind(this));
					if(this.selectedOptionNum == thisOptionNum) {
						this.options[thisOptionNum].hide();
					}
					optionNum++;
				}.bind(this));
				
				this.optionsDiv.observe('mouseover', function() {
					this.optionsMenuDiv.show();
				}.bind(this));
				this.optionsDiv.observe('mouseout', function() {
					this.optionsMenuDiv.hide();
				}.bind(this));				
			}
			this.element.setStyle(this.style['default']);
			this.element.observe('click', this.safeClick.bind(this));

			$super(options);
		},
		setInput: function(newInput) {
			if(this.hasInput) {
				this.input.value = newInput;
			}
		},
		selectOptionNum: function(newOptionNum) {
			this.selectedOptionNum = newOptionNum;
			this.afterSelectOptionNum();
		},
		afterSelectOptionNum: function() { window.console.log('after'); },
		afterHilite: function() {
			if(this.multiOption) {
				this.menuDiv.show();
			}
			this.element.setStyle(this.style['hilite']);
/*			$('hoverinfo').setStyle({
				display: 'inline-block'
			});
			$('hoverinfo').update(this.descriptor);*/
			this.afterAfterHilite();
		},
		afterAfterHilite: function() {},
		afterUnhilite: function() {
			if(this.multiOption) {
				this.menuDiv.hide();
			}
			this.element.setStyle(this.style['unhilite']);
/*			$('hoverinfo').update('');
			$('hoverinfo').hide();*/
			this.afterAfterUnhilite();
		},
		afterAfterUnhilite: function() {},
		afterSelect: function() {
			if(this.onSelect) {
				var executeOnSelect = this.onSelect.bind(this);
				executeOnSelect(); // execute this code even if 'cannotbeselected'
			}
			if(this.cannotBeSelected) {
				this.unselect();
				return;
			}
			// we only get here if this is a selectable control.
			// therefore, save the setting in window.location.hash.
			this.element.setStyle(this.style['select']);
			this.afterAfterSelect();
		},
		afterAfterSelect: function() {},
		afterUnselect: function() {
			this.element.setStyle(this.style['unselect']);
			this.afterAfterUnselect();
		},
		afterAfterUnselect: function() {}
	}
);
var AnimationControl = Class.create(RightHandControl,
	{
		initialize: function($super, options) {
			options.id = 'animation';
			options.name = 'Animate overlays.';
			options.type = 'animation';
			options.descriptor = 'Click to see current overlays year-by-year.';
			$super(options);
		}
	}
);
var AddressJump = Class.create(RightHandControl,
	{
		initialize: function($super, options) {
			options.type = 'addressJump';
			options.id = 'addressJump';
			options.name = 'Go to address [input]';
			options.descriptor = 'Press "enter" or click out to jump to the address';
			options.trueByDefault = false;
			options.isRadio = false;
			options.colorArray = [255,255,255];
			$super(options);
			this.geocoder = options.geocoder;
			this.map = options.map;
		},
		// prevent all this stuff, this is an unselectable control
	/*	hilite: function() {
		},
		unhilite: function() {
		},*/
		click: function() {
		},
		submit: function() {
			this.input.blur();
			
			newAddress = this.input.getValue();
			
			if(newAddress) {
				newAddress = newAddress + ', NY, USA';
				if(!Status.isBusy()) {
					Status.set('lookingforaddress', 'Looking for ' + newAddress);
					this.geocoder.getLocations(
						newAddress,
						function(locations) {
							if(locations.Placemark.size() < 1 || locations.Placemark[0].AddressDetails.Accuracy != 8) {
							//	Status.setProgress('Could not find ' + newAddress);
							} else if(locations.Placemark.size() > 1) {
							//	Status.setProgress('Found multiple responses for ' + newAddress);
							} else {
								var location = locations.Placemark[0];
							//	Status.setTitle('Found ' + location.address);
								var lon = location.Point.coordinates[0];
								var lat = location.Point.coordinates[1];
								var addressPoint = new OpenLayers.Geometry.Point(lon,lat);
								addressPoint.transform(
									new OpenLayers.Projection('EPSG:4326'),
									new OpenLayers.Projection('EPSG:900913')
								);
		
								var addressBounds = new OpenLayers.Bounds(
									lon-.00009, lat-.00009,
									lon+.00009, lat+.00009
								);
								addressBounds.transform( // for some reason, google insists on us making this conversion.
									new OpenLayers.Projection('EPSG:4326'),
									new OpenLayers.Projection('EPSG:900913')
								);
								var addressLonLat = new OpenLayers.LonLat(addressPoint.x, addressPoint.y);
								new Ajax.Request('/cgi-bin/infoForJump.pl', {
									method: 'get',
									parameters: {
										'lon': addressPoint.x,
										'lat': addressPoint.y
									},
									onSuccess: function(transport) {
										var data = transport.responseText.evalJSON().flatten();
										
										var lotDistrictId = data[0];
										var lotCensustractId = data[1];
										var lotGeolotId = data[2];
										var censustractId = data[3];
										var censustractDescriptor = data[4];
										var censustractLotcount = data[5];
										var censustractGeom = data[6];
										
										if(theControls.get('feature').get(censustractId)) { // exists already, jump to it.
											theControls.get('feature').get(censustractId).zoom();
										} else { // does not exist, make it.
											var wktReader = new OpenLayers.Format.WKT();
											
											var feature = wktReader.read(censustractGeom);
											feature.fid = censustractId;
											feature.attributes.descriptor = censustractDescriptor;
											feature.attributes.lotcount = censustractLotcount;
																				
											var genericFeatureControl = theControls.get('feature').values().first();
											var jumpToFeature = new FeatureControl({
												featureType: 'censustract',
												outlinesOverlay: genericFeatureControl.outlinesOverlay,
												invisibleOutlinesOverlay: genericFeatureControl.invisibleOutlinesOverlay,
												handler: genericFeatureControl.handler,
												parent: genericFeatureControl,
												feature: feature
											});
											jumpToFeature.zoom();
										}
									}.bind(this)
								});	
								
							}
							Status.clear('lookingforaddress');
						}.bind(this)
					);
				}
			}
		}
	}
);

var HiliteControl = Class.create(RightHandControl,
	{
		initialize: function($super, options) {
			
			options.type = 'hilite';
			options.isRadio = false;
			this.originalName = options.name;
			
			// all 'prev' Datas and stats are for animation purposes
			this.prevDataForHilitedYear = {};
			this.prevDataForSelectedFeature = {};
			this.prevMaxValueForSelectedFeature = {};
			
			this.prevStatsForHilitedYear = {};
			this.prevStatsForSelectedFeature = {};
			
			this.dataForHilitedYear = {};
			this.dataForSelectedFeature = {};
			this.maxValueForSelectedFeature = {};
			
			this.statsForHilitedYear = {}; // the mean ratio and the standard deviation.
			this.statsForSelectedFeature = {}; // the mean ratio and the standard deviation.
			
			this.partyData = new Hash(); // because we might have weird values...
			this.dollarCutoff = options.dollarCutoff;
			this.canBeDots = options.canBeDots;
			
			$super(options);
			
			var popoutMenuCode = '<div id="' + this.id + '_popoutMenu""></div>';
			this.element.insert(popoutMenuCode);
			this.popoutMenu = $(this.id + '_popoutMenu');
			this.popoutMenu.setStyle({
				position: 'absolute',
				top: '0px',
				cursor: 'pointer',
				right: '150px',
				zIndex: '10010',
				background: 'white',
				border: '1px solid black'
			});
			this.popoutMenu.hide();
			
			this.map = options.map;
			this.scriptCode = options.scriptCode;
			this.colorParts = options.colorParts;
			if(!this.input) {
				this.input = {getValue: function() { return ''; }}
			}
			
			this.isDrawn = false;
			this.drawnForYear = null;
			this.drawnForFeature = null;
			this.drawnForInputValue = null;
		},
		forceValue: function(newValue, newYear) {
			this.input.value = newValue;
		//	this.unselect();
			if(this.getHilitedYear() != newYear) {
				theControls.get('year').get('mapYear').changeYear(newYear);
			} else {
				this.submit();
			}
		//	this.select();
		},
		title: function() {
			return this.originalName.replace('[input]', this.input.getValue());
		},
		getHilitedYear: function() {
			return theControls.get('year').get('mapYear').year;
		},
		updateDataForHilitedYear: function() {
			if(this.drawnForYear != this.getHilitedYear()
				||
				this.drawnForInputValue != this.input.getValue()
				||
				this.drawnForFeature != theSelectedControls.get('feature').values()[0].id
			) {
				this.isDots = false;
				if(this.canBeDots == true) {
					if(this.dataForSelectedFeature[this.getHilitedYear()]) {
						if(this.dataForSelectedFeature[this.getHilitedYear()].number < 300) { // we have to call this -after- we have this data.
							this.isDots = true;
						}
					} else {
						this.isDots = true;
					}
				}
				
				Status.set('obtaininggeographicmapoverlaydata' + this.id, 'Obtaining geographic ' + this.title() + ' data for ' + this.getHilitedYear());
				if(productionType == 'pulaskistproject') {
					var scriptFile = '/cgi-bin/dataByHiliteYearNew.pl';
				} else {
					var scriptFile = '/cgi-bin/dataByHiliteYear.pl'
				}
				new Ajax.Request(scriptFile, 
				{
					method: 'get',
					parameters: {
						'hilite': this.scriptCode,
						'year': this.getHilitedYear(),
						'value': this.input.getValue().replace(' ', '%'), // replace spaces with wildcards, a wildcard is attached to end as well.
						'dots': this.isDots,
						'feature': theSelectedControls.get('feature').values()[0].id
					},
					onSuccess: function(transport) {
						Status.clear('obtaininggeographicmapoverlaydata' + this.id);
						var data = $A(transport.responseText.evalJSON());
						var ratioList = new Array();
						
						this.prevDataForHilitedYear = copyObject(this.dataForHilitedYear);
						this.dataForHilitedYear = {};
						
						// insert any type of feature-by-feature data into dataForHilitedYear
						data.each(function(item) {
							// if there's no info about this feature, don't make it.
							if(!theControls.get('feature').get(item[1])) { return; }
							if(item[2] == null) { // is a feature summary row. only one of these per feature (which is called item[1])
								this.dataForHilitedYear[item[1]] = {
									number: Number(item[3]),
									dollar: Number(item[4]),
									partys: new Hash(),
									fromSummary: true
								}
							} else { // is a party row.
								if(!this.dataForHilitedYear[item[1]]) {
									this.dataForHilitedYear[item[1]] = {
										number: 0,
										dollar: 0,
										partys: new Hash(),
										fromSummary: false
									};
								}
								// simulate summary info IF NOT from summary row.
								if(this.dataForHilitedYear[item[1]].fromSummary == false) {
									this.dataForHilitedYear[item[1]].number += Number(item[5]);
									this.dataForHilitedYear[item[1]].dollar += Number(item[6]);
								}
								this.dataForHilitedYear[item[1]].partys.set(item[2], {
									number: Number(item[5]),
									dollar: Number(item[6])
								});
							}
						}, this);
						
						for(featureid in this.dataForHilitedYear) {
							if(this.dataForHilitedYear[featureid].fromSummary == false) {
								var numbersum = 0;
								var dollarsum = 0;
								this.dataForHilitedYear[featureid].partys.values().pluck('number').each(function(number) { numbersum += number; });
								this.dataForHilitedYear[featureid].partys.values().pluck('dollar').each(function(dollar) { dollarsum += dollar; });
								this.dataForHilitedYear[featureid].number = numbersum;
								this.dataForHilitedYear[featureid].dollar = dollarsum;
							}
							var lotcount = theControls.get('feature').get(featureid).parent.childData[featureid].lotcount; // ratios depend on the varied lotcounts of the parent.							
							ratioList.push(this.dataForHilitedYear[featureid].number/lotcount);
							
							this.dataForHilitedYear[featureid].partys = this.dataForHilitedYear[featureid].partys.sortBy(
								function(pair) {
									return -pair[1].number;
								}
							).toArray();
						}
						var sum = 0;
						ratioList.each(function(ratio) { sum += ratio; });
						var mean = sum/ratioList.size();
						var deviations = ratioList.collect(function(ratio) { return ratio - mean; });
						var squaredeviations = deviations.collect(function(deviation) { return deviation * deviation; });
						var squaredeviationsum = 0;
						squaredeviations.each(function(squaredeviation) { squaredeviationsum += squaredeviation; });
						var meansquaredeviation = squaredeviationsum/(ratioList.size()-1);
						var stddeviation = Math.sqrt(meansquaredeviation);
						
						this.prevStatsForHilitedYear = copyObject(this.statsForHilitedYear);
						this.statsForHilitedYear.mean = mean;
						this.statsForHilitedYear.stddeviation = stddeviation;
						
						if(this.isDots) { // draw dots syntax.
							this.hiliteOverlay = this.map.getLayersByName(this.type + '_' + this.id)[0];
							if(!this.hiliteOverlay) {
								var hiliteStylemap = new OpenLayers.StyleMap({
									'default': new OpenLayers.Style({
										'pointRadius': '${calcPointRadius}',
										'fillColor': '${color}',
										'fillOpacity': 1,
										'strokeWidth': '${calcStrokeWidth}'
									},
									{
										context: {
											calcPointRadius: function(feature) {
												var curRes = feature.layer.map.getResolution();
												if(curRes > 150) {
													return 3;
												} else if (curRes > 5) {
													return 4;
												} else {
													return 6;
												}
											},
											calcStrokeWidth: function(feature) {
												var curRes = feature.layer.map.getResolution();
												if(curRes > 150) {
													return .5;
												} else if (curRes > 5) {
													return 1;
												} else {
													return 2;
												}
											},
											color: function(feature) {
												return feature.attributes.color;
											}
										}
									})
								});
								this.hiliteOverlay = new OpenLayers.Layer.Vector(
									this.type + '_' + this.id,
									{
										styleMap: hiliteStylemap,
										isBaseLayer: false
									}
								);
							}
							this.map.addLayer(this.hiliteOverlay); // add the necessary points.
							var featuresToAdd = new Array();
							
							// add the dot features, create summary data from individual dots.
							data.each(function(hilitedDot) {
								var point = hilitedDot[0].split(' ');
								var featureToAdd = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(point[0], point[1]));
								featureToAdd.attributes.color = this.color;
								featuresToAdd.push(featureToAdd);
								var featureidArray = hilitedDot[1].split('-'); // add summary rows, as they are lacking in point data.
								var party = hilitedDot[2];
								// for districts.
								if(!this.dataForHilitedYear[featureidArray[0]]) {
									this.dataForHilitedYear[featureidArray[0]] = {
										number: Number(hilitedDot[3]),
										dollar: Number(hilitedDot[4]),
										partys: new Hash()
									}
									this.dataForHilitedYear[featureidArray[0]].partys.set(party, {
										number: Number(hilitedDot[3]),
										dollar: Number(hilitedDot[4])
									});
								} else {
									this.dataForHilitedYear[featureidArray[0]].number += Number(hilitedDot[3]);
									this.dataForHilitedYear[featureidArray[0]].dollar += Number(hilitedDot[4]);
									//if the party already exists, increment it.
									if(this.dataForHilitedYear[featureidArray[0]].partys.get(party)) {
										this.dataForHilitedYear[featureidArray[0]].partys.get(party).number += Number(hilitedDot[3]);
										this.dataForHilitedYear[featureidArray[0]].partys.get(party).dollar += Number(hilitedDot[4]);										
									} else {
										this.dataForHilitedYear[featureidArray[0]].partys.set(party, {
											number: Number(hilitedDot[3]),
											dollar: Number(hilitedDot[4])
										});
									}
								}
								
								// for censustracts
								if(!this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]]) { 
									this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]] = {
										number: Number(hilitedDot[3]),
										dollar: Number(hilitedDot[4]),
										partys: new Hash()
									}
									this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].partys.set(party, {
										number: Number(hilitedDot[3]),
										dollar: Number(hilitedDot[4])
									});
								} else {
									this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].number += Number(hilitedDot[3]);
									this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].dollar += Number(hilitedDot[4]);
									//if the party already exists, increment it.
									if(this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].partys.get(party)) {
										this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].partys.get(party).number += Number(hilitedDot[3]);
										this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].partys.get(party).dollar += Number(hilitedDot[4]);										
									} else {
										this.dataForHilitedYear[featureidArray[0] + '-' + featureidArray[1]].partys.set(party, {
											number: Number(hilitedDot[3]),
											dollar: Number(hilitedDot[4])
										});
									}
								}
							}.bind(this));
							this.hiliteOverlay.destroyFeatures();
							this.hiliteOverlay.addFeatures(featuresToAdd);
							this.hiliteOverlay.redraw();
						} else {
							if(this.hiliteOverlay) {
								this.hiliteOverlay.destroyFeatures();
							}
						}
						// this will cause lots of outlinesoverlay redraws....
						theSelectedControls.get('feature').values()[0].outlinesOverlay.redraw(); // redraw the outlines even if not dots, in order to clear up residual coloring.
				//		theGraph.draw();
					}.bind(this)
				});	
				this.drawnForInputValue = this.input.getValue();
				this.drawnForYear = this.getHilitedYear();
				this.drawnForFeature = theSelectedControls.get('feature').values()[0].id;
			}
		},
		updateDataForSelectedFeature: function() {
			if(this.drawnForFeature != theSelectedControls.get('feature').values()[0].id || this.input.getValue() != this.drawnForInputValue) {
				Status.set('obtainingyearlymapoverlaydata' + this.id, 'Obtaining yearly ' + this.title() + ' data for ' + theSelectedControls.get('feature').values()[0].id);
				if(productionType == 'pulaskistproject') {
					var scriptFile = '/cgi-bin/dataByHiliteFeatureNew.pl';
				} else {
					var scriptFile = '/cgi-bin/dataByHiliteFeature.pl'
				}
				new Ajax.Request(scriptFile, 
				{
					method: 'get',
					parameters: {
						'hilite': this.scriptCode,
						'feature': theSelectedControls.get('feature').values()[0].id,
						'value': this.input.getValue().replace(' ', '%')
					},
					onSuccess: function(transport) {
						Status.clear('obtainingyearlymapoverlaydata' + this.id);
						var data = $A(transport.responseText.evalJSON());
						
						this.prevDataForSelectedFeature = copyObject(this.dataForSelectedFeature);
						this.dataForSelectedFeature = {};
						
						var maxNumber = 1; // scale the graph
						var maxDollar = 1;
						data.each(function(yearData) { // [0]-> year, [1]-> summarynumber, [2]->summarydollar, [3]->partynumber, [4]->partydollar, [5]-> party2
							var year = Number(yearData[0]);
							var number = Number(yearData[1]);
							var dollar = Number(yearData[2]);
							dollar = dollar.round();
							if(yearData[0] != null && yearData[5] == null) { // is a summary row.
								maxNumber = (number > maxNumber) ? number : maxNumber;
								maxDollar = (dollar > maxDollar) ? dollar : maxDollar;
								this.dataForSelectedFeature[year] = {
									number: number,
									dollar: dollar,
									partys: new Hash()
								}
							} else if(yearData[5] != null) { // when these rows appear, the summary row should have already come
								this.dataForSelectedFeature[year].partys.set(yearData[5], {
									number: Number(yearData[3]),
									dollar: Number(yearData[4]).round()
								});
							}
						}.bind(this));
						this.maxValueForSelectedFeature = {
							number: maxNumber,
							dollar: maxDollar
						};
						this.updateDataForHilitedYear();
						theGraph.draw(); // currently calling this function for every single hilite -- mucho wasteful
					}.bind(this)
				});
			} else {
				this.updateDataForHilitedYear();
			}
		},
		afterAfterHilite: function() {
			if(this.partyData.size() > 0) {
				this.popoutMenu.show();
				this.popoutMenu.update(this.partyData.inspect());
			}
		},
		afterAfterUnhilite: function() {
			this.popoutMenu.hide();
		},
		afterAfterSelect: function() {
			if(this.hasInput && this.input.getValue() == '') {
				this.unselect();
				return;
			}
			this.isDrawn = true;
			if(this.hiliteOverlay && this.isDots) {
				this.hiliteOverlay.setVisibility(true);
			} else {
				theSelectedControls.get('feature').values()[0].outlinesOverlay.redraw();
			}
//			this.updateDataForHilitedYear();
			this.updateDataForSelectedFeature(); // calls updateDataForHilitedYear upon completion.
			theGraph.draw();
		},
		afterAfterUnselect: function() {
			if(this.hiliteOverlay && this.isDots) {
				this.hiliteOverlay.setVisibility(false);
			} else {
				theSelectedControls.get('feature').values()[0].outlinesOverlay.redraw();
			}
			theGraph.draw();
			this.isDrawn = false;
		},
		submit: function() {
			this.select();
		}
	}
);
var FeatureControl = Class.create(MyControl,
	{
		initialize: function($super, options) {
			
			this.feature = options.feature;
			this.parent = options.parent;
				
			this.normalChildSize = null; // standard pixel size for children, universal scaling unmodified by time.
			
			this.id = this.feature.fid;
			this.name = this.feature.fid;
			this.feature.id = this.id;
			this.type = 'feature';		

			$super({isRadio: true, trueByDefault: false});
			
			// 'prev' datas are for animation purposes.
			this.prevChildData = {};
			this.prevData = {};
			this.animationStep = 0;
			
			this.childData = {};
			this.data = {};
			this.dataYear = null;
			this.childFeatureControls = new Hash();
			this.featureType = options.featureType;

			this.handler = options.handler;
			this.outlinesOverlay = options.outlinesOverlay;
			this.invisibleOutlinesOverlay = options.invisibleOutlinesOverlay;
			this.outlinesOverlay.styleMap = this.styleMaps.outlines;
			this.invisibleOutlinesOverlay.styleMap = this.styleMaps.invisible;
			
			this.feature.featureControl = this;

			this.mortgagePointFeature = this.feature.clone();
			this.deedPointFeature = this.feature.clone();
			
			this.mortgagePointFeature.featureControl = this;
			this.deedPointFeature.featureControl = this;
						
			this.mortgagePointFeature.id = this.mortgagePointFeature.id + '_mortgage';
			this.deedPointFeature.id = this.deedPointFeature.id + '_deed';
			
			this.mortgagePointFeature.attributes.color = '#0f0';
			this.deedPointFeature.attributes.color = '#00f';
			
			this.mortgagePointFeature.attributes.type = 'mortgage';
			this.deedPointFeature.attributes.type = 'deed';
			
			switch(this.featureType) {
				case 'NYC':
					this.level = 1;
					this.childFeatureType = 'district';

					this.descriptor = 'New York City';

					break;
				case 'district':
					this.level = 3;
					this.childFeatureType = 'censustract';
					this.parentFeatureType = 'district';
					
					this.descriptor = cdNumberToName[this.feature.fid];
					break;
				case 'censustract':
					this.level = 4;
					this.childFeatureType = 'lot';
					this.parentFeatureType = 'district';
					
					this.descriptor = this.feature.attributes.descriptor + ' (' + this.feature.fid.split('-')[1] + ')';
					
					break;
				case 'lot': // will the fact that the fid doesn't differentiate between blocks here cause a problem?
					this.level = 5;
					this.childFeatureType = null;
					this.parentFeatureType = 'censustract';

					this.descriptor = this.feature.attributes.descriptor;
	
					break;
				default:
					return;
			}
			if(this.featureType == 'lot') {// work lots w/ outlines instead of central points.
				this.zoomHoverInfo = "Click for property history.";
				
				var featureCenterLonLat = this.feature.geometry.getBounds().getCenterLonLat();
				this.mortgagePointFeature.geometry = new OpenLayers.Geometry.Point(featureCenterLonLat.lon, featureCenterLonLat.lat);
				this.deedPointFeature.geometry = new OpenLayers.Geometry.Point(featureCenterLonLat.lon, featureCenterLonLat.lat);
			} else {
			//	this.zoomHoverInfo = "Double-click to zoom in.";

				this.mortgagePointFeature.geometry = this.mortgagePointFeature.geometry.getCentroid();
				this.deedPointFeature.geometry = this.deedPointFeature.geometry.getCentroid();
			}
			
			this.desiredZoom = this.outlinesOverlay.map.getZoom();
		},
		// paradoxically, selection means the children should be drawn while the feature itself should be -removed-
		// selection should also kill the parent, if it survives -- leaving orphaned children.
		afterSelect: function() { // the isSelected property is set by the class.	
			setMapCursor('move');
			if(theSelectedControls.get('hilite')) { // have to invoke this every time, because it changes with every scale shift.
				theSelectedControls.get('hilite').values().invoke('updateDataForSelectedFeature');
			}
			theGraph.draw();
			if(this.childFeatureControls.size() > 0) {
				this.showChildren();
			}
			if(this.dataYear != theControls.get('year').get('mapYear').year) {
				this.updateChildData(); // will redrawChildren upon the childData being received
			} else {
				this.redrawChildren();
			}
			this.redraw();
		},
		finishedZooming: function() { // called by the map's event's handler when the desiredZoom == the map's current zoom
			var waitForClearStatus = setInterval(function() {
				if(!Status.isBusy()) {
					clearInterval(waitForClearStatus);
			/*		if(!this.zoomingIn) {
						var centroid = this.feature.geometry.getCentroid();
						this.outlinesOverlay.map.panTo(new OpenLayers.LonLat(centroid.x, centroid.y));
					}*/
			//		this.outlinesOverlay.setVisibility(true);

					this.handler.activate();
				}
			}.bind(this), 100);
		},
		afterUnselect: function () {
			if(this.isHilited) {
				this.feature.renderIntent = "hilite";
			}
		},
		afterHilite: function() {
			this.feature.renderIntent = "hilite";
	//		setMapCursor('url(img/magnipan.gif),pointer');
			setMapCursor('pointer');
			this.redraw();

			if(this.parent) { // orphaned children don't get this full readout.
				var dataForThis = this.parent.childData[this.name];
				
				if(dataForThis) {
					var hiliteInfo = '<b>' + makeNameAttractive(this.descriptor) + '</b>';
					
					if(dataForThis.lotcount > 1) {
						hiliteInfo += ' (' + addCommasToNumber(dataForThis.lotcount) + ' properties)';
					}
					hiliteInfo += '<br>';

					theSelectedControls.get('hilite').each(function(pair) {
						if(pair.value.dataForHilitedYear[this.id]) { // if this data exists...
							hiliteInfo += '<li><span style="color:' + pair.value.color + '">' + addCommasToNumber(pair.value.dataForHilitedYear[this.id].number) + ' ' + pair.value.title();
							hiliteInfo += ' ' + OpenLayers.Number.limitSigDigs((pair.value.dataForHilitedYear[this.id].number / dataForThis.lotcount)*100, 3) + '% ';
							if(pair.value.dollarCutoff < theControls.get('year').get('mapYear').year) {
								hiliteInfo += ' for $' + addCommasToNumber(OpenLayers.Number.limitSigDigs(pair.value.dataForHilitedYear[this.id].dollar, 3));
							}
							// display the most prominent parties.
							if(pair.value.dataForHilitedYear[this.id].partys[0]) {
								var maxParties = ((pair.value.dataForHilitedYear[this.id].partys.size() > 3) ? 3 : pair.value.dataForHilitedYear[this.id].partys.size());
								for(var i = 0; i < maxParties; i++) {
									hiliteInfo += '<br>'
									+ OpenLayers.Number.limitSigDigs((pair.value.dataForHilitedYear[this.id].partys[i].value.number/pair.value.dataForHilitedYear[this.id].number)*100, 2)
									+ '%: '
									+ pair.value.dataForHilitedYear[this.id].partys[i].key
									+ ', '/* + addCommasToNumber(leadingPartys[i].value.number)*/;
								}
							}
							hiliteInfo += '</span><br>';
						}
					}.bind(this));
/*					$('hoverinfo').setStyle({
						display: 'inline-block'
					});
					$('hoverinfo').update(hiliteInfo);*/
					return 0; // prevent the label update from happening.
				}
			}
/*			$('hoverinfo').setStyle({
				display: 'inline-block'
			});
			$('hoverinfo').update(this.descriptor);*/
		},
		afterUnhilite: function() {
			this.feature.renderIntent = 'default';
		//	setMapCursor('url(img/minipan.gif),move');
			setMapCursor('move');
/*			if(this.level > 1) {
				$('hoverinfo').hide();
			}*/
			this.redraw(); // no longer necessary, as only one feature can now be drawn.
		},
		updateChildData: function() {
			this.dataYear = theControls.get('year').get('mapYear').year;
			Status.set('gatheringchildrenfeaturedata' + this.id, 'Gathering geometries for ' + this.descriptor + '\'s ' + this.childFeatureType + 's in ' + this.dataYear);
			
			var needToMakeChildren = false;
			if(this.childFeatureControls.size() == 0 && this.childFeatureType) {
				needToMakeChildren = true;
			}
			if(productionType == 'pulaskistproject') {
				var scriptFile = '/cgi-bin/children.pl';
			} else {
				var scriptFile = '/cgi-bin/children.pl'
			}
			new Ajax.Request(scriptFile,
				{
					method: 'get',
					parameters: {
						feature: this.name,
						year: this.dataYear,
						includeGeometry: needToMakeChildren
					},
					onSuccess: function(transport) {
						Status.clear('gatheringchildrenfeaturedata' + this.id);
						var data = $A(transport.responseText.evalJSON());
						if(this.childFeatureType) {
							if(needToMakeChildren) {
								this.hideChildren();
								this.childFeatureControls = new Hash();
								
								var wktReader = new OpenLayers.Format.WKT();
								
								var features = new Array();
								
								var addChildSize = 0;
								
								for(var i = 0; i < data.size(); i++) {
									var feature = wktReader.read(data[i][3]);
									feature.fid = data[i][0];
									feature.attributes.descriptor = data[i][1];
									feature.attributes.lotcount = data[i][2];
									
									var childSize = feature.geometry.getBounds().toArray();
									var leftTopLonLat = new OpenLayers.LonLat(childSize[0], childSize[1]);
									var rightBottomLonLat = new OpenLayers.LonLat(childSize[2], childSize[3]);
									var leftTopPx = this.outlinesOverlay.getViewPortPxFromLonLat(leftTopLonLat);
									var rightBottomPx = this.outlinesOverlay.getViewPortPxFromLonLat(rightBottomLonLat);
									var width = rightBottomPx.x - leftTopPx.x;
									var height = leftTopPx.y - rightBottomPx.y;
									addChildSize += (width + height) /6;
									var newChildFeatureControl = new FeatureControl({
										featureType: this.childFeatureType,
										outlinesOverlay: this.outlinesOverlay,
										invisibleOutlinesOverlay: this.invisibleOutlinesOverlay,
										handler: this.handler,
										parent: this,
										feature: feature
									});
									
									this.childFeatureControls.set(feature.fid, newChildFeatureControl);
								}
								this.normalChildSize = addChildSize/data.size();
								this.showChildren();
							}
							this.prevChildData = copyObject(this.childData); // clone the object without keeping prototype's fancy hash wrapper.
							this.childData = {}; // clear out old data.
							
							for(var i = 0; i < data.length; i++) {
								var name = data[i][0];
								this.childData[name] = {
									lotcount: Number(data[i][2])
								};
							}
							if(!this.prevChildData.length) { // for the very first time we load data.
								this.prevChildData = this.childData;
							}
						} else { // for single lots.
							this.data = data;
						}
					}.bind(this)
				}
			);
		},
		redraw: function() {
			if(!this.isSelected || this.type == 'lot') { // selected features must not be drawn, they obscure their own children -- except for lots.
				this.invisibleOutlinesOverlay.drawFeature(this.feature);
			}
		},
		redrawChildren: function() {
			this.outlinesOverlay.redraw();
		},
		hideChildren: function() {
			this.outlinesOverlay.removeFeatures(this.childFeatureControls.values().pluck('feature'), {silent: true});
			this.invisibleOutlinesOverlay.removeFeatures(this.childFeatureControls.values().pluck('feature'), {silent: true});
		},
		showChildren: function() {
			this.outlinesOverlay.addFeatures(this.childFeatureControls.values().pluck('feature'), {silent: true});
			this.invisibleOutlinesOverlay.addFeatures(this.childFeatureControls.values().pluck('feature'), {silent: true});
		},
		hide: function() {
		//	this.outlinesOverlay.removeFeatures([this.feature]);
			this.invisibleOutlinesOverlay.removeFeatures([this.feature]);
		},
		show: function() {
		//	this.outlinesOverlay.addFeatures([this.feature]);
			this.invisibleOutlinesOverlay.addFeatures([this.feature]);
		},
		hideSiblings: function() {
			if(this.parent) {
				this.parent.hideChildren();
			}
		},
		showSiblings: function() {
			if(this.parent) { // show the feature, not either pointfeature
				this.parent.showChildren();
			}
		},
		hideParent: function() {
			if(this.parent) {
				this.parent.hide();
			}
		},
		showParent: function() {
			if(this.parent) {
				this.parent.show();
			}
		},
		// IF we're zooming in, the new selected featureControl must be undrawn, its siblings should be rendered clear, and its parent's siblings should be removed from the map.
		//																	  parent's children must be rendered clear, and its parent's parent's siblings should be removed from the map.
		//																former selected feature must be rendered clear, and former selected feature's parent should be removed from the map
		// IF we're panning,    the new selected featureControl must be undrawn, its siblings should be rendered clear, and the former selected feature's children must be destroyed wholly
		//																	  parent's children must be rendered clear
		// IF we're zooming out, the new selected featureControl remains undrawn, all its siblings must be rendered clear, and all its children must be drawn.
		zoom: function(options) {
			if(!options) { options = {}; }
			
			if(!this.childFeatureType) { // interrupt for lots, which are special cases. Can't zoom in.
			//	this.updateChildData();
				alert(this.id);
				return;
			}
			
			this.handler.deactivate(); // meant to speed up zooming.

			var formerSelectedFeatureControl = theSelectedControls.get('feature').values()[0]; // doesn't allow for multiple selections, obviously.
			var oldLevel = (formerSelectedFeatureControl)? formerSelectedFeatureControl.level : 0; // to make the initial zoom a 'zoomin'
			
			if(formerSelectedFeatureControl) { // this code will be called every time except for the initial selection
				formerSelectedFeatureControl.hide();
				formerSelectedFeatureControl.hideChildren();
				formerSelectedFeatureControl.hideSiblings();
			}
			this.hideParent();			
			this.showSiblings();
			this.hide();
			this.select(); // will showChildren (afterselect)
			
			if(!options.noZoom) {
				var prevZoom = this.outlinesOverlay.map.getZoom();
				this.desiredZoom = this.outlinesOverlay.map.getZoomForExtent(this.feature.geometry.getBounds(), true); // the boolean controls whether this includes the possibility of truncation
				this.zoomingIn = (this.desiredZoom > prevZoom)? true : false;
				
				if(this.zoomingIn) {
					var centroid = this.feature.geometry.getCentroid();
					this.outlinesOverlay.map.panTo(new OpenLayers.LonLat(centroid.x, centroid.y));
				 }
				this.outlinesOverlay.map.zoomTo(this.desiredZoom);
			}
			this.finishedZooming();
		},
		styleMaps: {
			'outlines': new OpenLayers.StyleMap({
				'default': new OpenLayers.Style({
					fillOpacity: '${calcFillOpacity}',
					fillColor: '#${calcFillColor}',
					strokeWidth: '${calcStrokeWidth}',
					strokeColor: '#fff',
					strokeOpacity: .5,
		/*			label: '${calcLabel}',*/
					fontColor: 'white',
					labelAlign: 'cm',
					fontSize: '10pt',
					fontFamily: 'Palatino',
					featureValue: '${calcFeatureValue}'
				},
				{
					context: {
						calcFillOpacity: function(feature) {
							if(!feature.featureControl.isSelected && feature.featureControl.parent) { // since we want to start drawing the borders for selected features.
								if(feature.featureControl.parent.isSelected == true) { // siblings don't get color.
							//		window.console.log(theSelectedControls.get('hilite').values().pluck('isDots').find(function(isDots) { if(isDots == false) { window.console.log('returned true'); return true; } } ));
									if(theSelectedControls.get('hilite').values().pluck('isDots').find(function(isDots) { if(isDots == false) {return true; } } ) == false) {
										return 1;
									}
								}
							}
							return 0;
						},
						calcFillColor: function(feature) { // use the flexi for fillColor -- colors vary based off of year
							var g = 0;
							var b = 0;
							var r = 0;
							if(!feature.featureControl.isSelected && feature.featureControl.parent) { // an exception case, since the top level (NYC) has no parent (and no info) but still can call this function.
								if(feature.featureControl.parent.isSelected == true) { // siblings don't get color.
									var dataForFeature = feature.featureControl.parent.childData[feature.featureControl.name];
									if(dataForFeature) {
										theSelectedControls.get('hilite').values().each(function(hiliteControl) {
											if(hiliteControl.isDots == false) {
												var meanRatio = hiliteControl.statsForHilitedYear.mean;
												var stddeviation = hiliteControl.statsForHilitedYear.stddeviation;
												if(hiliteControl.dataForHilitedYear[feature.id]/* && !hiliteControl.isDots*/) {
													var number = (hiliteControl.dataForHilitedYear[feature.id].number) ? Number(hiliteControl.dataForHilitedYear[feature.id].number) : 0;
													var percentage =
														(
															(number / Number(dataForFeature.lotcount))
																-
															(Number(meanRatio))
														)
														/Number(stddeviation*2);
													percentage += .5;
													percentage = (percentage > 1)? 1 : percentage;
													r += percentage*hiliteControl.colorArray[0];
													g += percentage*hiliteControl.colorArray[1];
													b += percentage*hiliteControl.colorArray[2];
												}
											}
										}.bind(this));
									
										r = (r > 255)? 255 : r;
										g = (g > 255)? 255 : g;
										b = (b > 255)? 255 : b;
										r = (r < 0)? 0: r;
										g = (g < 0)? 0: g;
										b = (b < 0)? 0: b;
										return ([r, g, b].invoke('round').invoke('toColorPart').join(''));
									}
								}
							}
							return ('000');
						},
						calcFeatureValue: function(feature) { // temporary func for extrusion purposes
							var g = 0;
							var b = 0;
							var r = 0;
							if(!feature.featureControl.isSelected && feature.featureControl.parent) { // an exception case, since the top level (NYC) has no parent (and no info) but still can call this function.
								if(feature.featureControl.parent.isSelected == true) { // siblings don't get color.
									var dataForFeature = feature.featureControl.parent.childData[feature.featureControl.name];
									if(dataForFeature) {
										theSelectedControls.get('hilite').values().each(function(hiliteControl) {
											if(hiliteControl.isDots == false) {
												var meanRatio = hiliteControl.statsForHilitedYear.mean;
												var stddeviation = hiliteControl.statsForHilitedYear.stddeviation;
												if(hiliteControl.dataForHilitedYear[feature.id]/* && !hiliteControl.isDots*/) {
													var number = (hiliteControl.dataForHilitedYear[feature.id].number) ? Number(hiliteControl.dataForHilitedYear[feature.id].number) : 0;
													var percentage =
														(
															(number / Number(dataForFeature.lotcount))
																-
															(Number(meanRatio))
														)
														/Number(stddeviation*2);
													percentage += .5;
													percentage = (percentage > 1)? 1 : percentage;
													r += percentage;
										//			r += percentage*hiliteControl.colorArray[0];
										//			g += percentage*hiliteControl.colorArray[1];
										//			b += percentage*hiliteControl.colorArray[2];
												}
											}
										}.bind(this));
									
								/*		r = (r > 255)? 255 : r;
										g = (g > 255)? 255 : g;
										b = (b > 255)? 255 : b;
										r = (r < 0)? 0: r;
										g = (g < 0)? 0: g;
										b = (b < 0)? 0: b;
										return ([r, g, b].invoke('round').invoke('toColorPart').join(''));*/
										return r*30;
									}
								}
							}
							return (0);
						},
						calcLabel: function(feature) {
							if(!feature.featureControl.isSelected && feature.featureControl.parent) { // an exception case, since the top level (NYC) has no parent (and no info) but still can call this function.
								if(feature.featureControl.parent.isSelected == true) { // siblings don't get color.
									var dataForFeature = feature.featureControl.parent.childData[feature.featureControl.name];
									if(dataForFeature) {
										var labels = $A();
										theSelectedControls.get('hilite').values().each(function(hiliteControl) {
											if(hiliteControl.isDots == false) {
												var meanRatio = hiliteControl.statsForHilitedYear.mean;
												var stddeviation = hiliteControl.statsForHilitedYear.stddeviation;
												if(hiliteControl.dataForHilitedYear[feature.id]/* && !hiliteControl.isDots*/) {
													
													// percentages:
												//	var number = (hiliteControl.dataForHilitedYear[feature.id].number) ? (String((Number(hiliteControl.dataForHilitedYear[feature.id].number)/ Number(dataForFeature.lotcount))*100)).substr(0,2) : 0;
												//	labels.push(number + '%');
												
													// leading party:
																				
													var party = (hiliteControl.dataForHilitedYear[feature.id].partys[0]) ? (hiliteControl.dataForHilitedYear[feature.id].partys[0].key) : '';
													labels.push(party);
												}
											}
										}.bind(this));
										return(labels.join(', '));
								//		return ('bleh');
/*										r = (r > 255)? 255 : r;
										g = (g > 255)? 255 : g;
										b = (b > 255)? 255 : b;
										r = (r < 0)? 0: r;
										g = (g < 0)? 0: g;
										b = (b < 0)? 0: b;
										return ([r, g, b].invoke('round').invoke('toColorPart').join(''));*/
									}
								}
							}
							return ('');
						},
						calcStrokeWidth: function(feature) {
							if(feature.featureControl.isSelected) { return(5); }
							if(feature.featureControl.isHilited) { return(2); }
							return(1);
						}
					}
				}
			)}),
			'invisible': new OpenLayers.StyleMap({
				'default': {
					invisible: true
				},
				'hilite': {
					invisible: false,
					fillOpacity: 0,
					strokeColor: 'f00',
					strokeOpacity: 1,
					strokeWidth: 3
				}
			})
		}
	}
);
/*Event.observe(window, 'mousemove', function(event) {
	var viewportWidth = document.viewport.getWidth();
	var hoverWidth = $('hoverinfo').getWidth();
	var pointerX = event.pointerX();
	var pointerY = event.pointerY();
	if(pointerX + hoverWidth + 20 < viewportWidth) { // can put it to the left -- the default.
		$('hoverinfo').setStyle({
			left: pointerX + 40 + 'px',
			top: pointerY + 'px'
		});
	} else {
		$('hoverinfo').setStyle({
			left: (pointerX - (40 + hoverWidth)) + 'px',
			top: pointerY + 'px'
		});
	}
//	$('hoverinfo').setOpacity(0.5);
});*/
OpenLayers.Renderer.Canvas.LABEL_ALIGN = { // weird bug, otherwise defaults to 'middle', which is not a valid alignText value for canvas renderer
	"l": "left",
	"r": "right",
	"c": "center"
};
// find another way to make the canvas elements, as IE can't make them fast
// enough for immediate initialization.
OpenLayers.Renderer.Canvas.prototype.initialize =	function(containerID) {
	OpenLayers.Renderer.prototype.initialize.apply(this,arguments);
	this.root=document.createElement("canvas");
	
	if(!this.root.getContext) { // hack for windows, which doesn't want to create a canvas element.
		this.root = window.G_vmlCanvasManager.initElement(this.root);
	}
	this.container.appendChild(this.root);
	this.canvas=this.root.getContext("2d");

	this.features={};
	this.geometryMap={};
	
};
// the createElement('canvas') check will fail on IE even with google's canvas extension.
OpenLayers.Renderer.Canvas.prototype.supported = function() {
//	var canvas = document.createElement("canvas");
//	return !!canvas.getContext;
	return true;
};
// keep track of a set of bounds for every single feature to speed up mouseovers
//OpenLayers.Renderer.Canvas.prototype.featureBounds = {};
OpenLayers.Renderer.Canvas.prototype.drawFeature = function(feature, style) {
	if(style == null) {
		style = feature.style;
	}
	style = OpenLayers.Util.extend({
	  'fillColor': '#000000',
	  'strokeColor': '#000000',
	  'strokeWidth': 2,
	  'fillOpacity': 1,
	  'strokeOpacity': 1
	}, style);
	this.features[feature.id] = [feature, style, feature.geometry.getBounds()]; // modified line: keep track of the geometry's boundaries (so they don't have to be recalculated each time in getfeatureidfromevent)
	if (feature.geometry) { 
		this.geometryMap[feature.geometry.id] = feature.id;
	}
	if(!style.invisible) {
		
		this.redraw(feature.id); // changed line: keeps track of which feature 'caused' redraw
	} else {
		this.clear();
	}
};

OpenLayers.Renderer.Canvas.prototype.getFeatureIdFromEvent = function(evt) { // patch(1): intersects with POINT instead of bounds, much faster.
// intersects with bounds derived from geometry first, then only does a full geometry check on a ones contained in bounds.
	if(isPanning) { return null; } // don't waste time on this feature if the mouse is pressed.
	var loc = this.map.getLonLatFromPixel(evt.xy);
	for (var feat in this.features) {
		if (!this.features.hasOwnProperty(feat)) { continue; }
		if (this.features[feat][0].featureControl.isSelected) { continue; }
		if (!this.features[feat][2].containsLonLat(loc)) { continue; } // added line: check loc. vs. BB before doing a full geometry check.
		if (this.features[feat][0].geometry.intersects(new OpenLayers.Geometry.Point(loc.lon, loc.lat))) {
			return feat;
		}
	} 
	return null;
};
OpenLayers.Renderer.Canvas.prototype.drawPoint = function(geometry, style) { // more bugginess with the Canvas renderer -- won't, by default, draw points with the pointRadius.
	if(style.graphic !== false) {
		var pt = this.getLocalXY(geometry);
		if(style.pointRadius > 0) {
			var radius = style.pointRadius;
		} else {
			var radius = 1;
		}
		if (style.externalGraphic) {
			this.drawExternalGraphic(pt, style);
		} else {
			if(style.fill !== false) {
				this.setCanvasStyle("fill", style);
				this.canvas.beginPath();
				this.canvas.arc(pt[0], pt[1], radius, 0, Math.PI*2, true);
				this.canvas.fill();
			}
			if(style.stroke !== false) {
				this.setCanvasStyle("stroke", style);
				this.canvas.beginPath();
				this.canvas.arc(pt[0], pt[1], radius, 0, Math.PI*2, true);
				this.canvas.stroke();
				this.setCanvasStyle("reset");
			}
		}
	}
};
OpenLayers.Renderer.Canvas.prototype.setCanvasStyle = function(type, style) {
	if (type == "fill") {     
		this.canvas.globalAlpha = style['fillOpacity'];
	//	this.canvas.globalAlpha = .5;
	//	var pattern = this.canvas.createPattern(img, 'repeat');
	//	this.canvas.fillStyle = pattern;
		this.canvas.fillStyle = style['fillColor'];
	} else if (type == "stroke") {  
		this.canvas.globalAlpha = style['strokeOpacity'];
		this.canvas.strokeStyle = style['strokeColor'];
		this.canvas.lineWidth = style['strokeWidth'];
	} else {
		this.canvas.globalAlpha = 0;
		this.canvas.lineWidth = 1;
	}
};
OpenLayers.Renderer.Canvas.prototype.drawTopLinearRing = function(geometry, style) {
	if(style.fill !== false) {
		this.setCanvasStyle("fill", style);
		this.canvas.beginPath();
		var start = this.getLocalXY(geometry.components[0]);
		start[0] -= (style.featureValue/2);
		start[1] -= style.featureValue;
		this.canvas.moveTo(start[0], start[1]);
		for(var i = 1; i < geometry.components.length - 1 ; i++) {
			var pt = this.getLocalXY(geometry.components[i]);
			pt[0] -= (style.featureValue/2);
			pt[1] -= style.featureValue;
			this.canvas.lineTo(pt[0], pt[1]);
		}
		this.canvas.fill();
	}
	if(style.stroke !== false) {
		var oldWidth = this.canvas.lineWidth; 
		this.setCanvasStyle("stroke", style);
		this.canvas.beginPath();
		var start = this.getLocalXY(geometry.components[0]);
		start[0] -= (style.featureValue/2);
		start[1] -= style.featureValue;
		this.canvas.moveTo(start[0], start[1]);
		for(var i = 1; i < geometry.components.length; i++) {
			var pt = this.getLocalXY(geometry.components[i]);
			pt[0] -= (style.featureValue/2);
			pt[1] -= style.featureValue;
			this.canvas.lineTo(pt[0], pt[1]);
		}
	}
	this.canvas.stroke();
	this.setCanvasStyle("reset");
};
OpenLayers.Renderer.Canvas.prototype.drawSideLinearRing = function(geometry, style, heightLimits) {
	window.console.log(heightLimits);
	if(style.fill !== false) {
	//	style.fillColor = 'black';
		this.setCanvasStyle("fill", {fillColor: '#000000', fillOpacity: .6});
//		this.canvas.fillStyle = '#000000';
		for(var i = 1; i < geometry.components.length ; i++) { // fill a polygon for eaach 'side' of the extrusion
			this.canvas.beginPath();
			var pt1 = this.getLocalXY(geometry.components[i]);
			if(i == geometry.components.length - 1) {
				var pt2 = this.getLocalXY(geometry.components[1]);
				var pt3 = this.getLocalXY(geometry.components[1]);
			} else {
				var pt2 = this.getLocalXY(geometry.components[i+1]);
				var pt3 = this.getLocalXY(geometry.components[i+1]);			
			}
			var pt4 = this.getLocalXY(geometry.components[i]);
			pt1[0] -= (heightLimits.from/2);
			pt1[1] -= heightLimits.from;
			pt2[0] -= (heightLimits.from/2);
			pt2[1] -= heightLimits.from;
			
			pt3[0] -= (heightLimits.to/2);
			pt3[1] -= heightLimits.to;
			pt4[0] -= (heightLimits.to/2);
			pt4[1] -= heightLimits.to;			
			this.canvas.moveTo(pt1[0], pt1[1]);
			this.canvas.lineTo(pt2[0], pt2[1]);
			this.canvas.lineTo(pt3[0], pt3[1]);
			this.canvas.lineTo(pt4[0], pt4[1]);
			this.canvas.fill();
		}
	}
/*	if(style.stroke !== false) {
		var oldWidth = this.canvas.lineWidth; 
		this.setCanvasStyle("stroke", style);
		this.canvas.beginPath();
		for(var i = 1; i < geometry.components.length; i++) {
			var pt = this.getLocalXY(geometry.components[i]);
			this.canvas.moveTo(pt[0], pt[1]);
			pt[0] -= (style.featureValue/2);
			pt[1] -= style.featureValue;
			this.canvas.lineTo(pt[0], pt[1]);
		}
	}*/
};

// added the 'style.invisible' check: skips all "invisible" geometry, massive rendertime savings.
OpenLayers.Renderer.Canvas.prototype.redraw = function() {
	if (!this.locked) {
		this.clear();
		var labelMap = [];
		var feature, style;
		for (var id in this.features) {
			if (!this.features.hasOwnProperty(id)) { continue; }
			style = this.features[id][1];
			if (style.invisible) { continue; } // added line.
			feature = this.features[id][0];
			if (!feature.geometry) { continue; }
			this.drawGeometry(feature.geometry, style);
			if(style.label) {
				labelMap.push([feature, style]);
			}
		}
		var item;
		for (var i=0; len=labelMap.length, i<len; ++i) {
			item = labelMap[i];
			this.drawText(item[0].geometry.getCentroid(), item[1]);
		}
	}
};

OpenLayers.Renderer.Canvas.prototype.redrawAlt = function(featureid) { // changed: keeps track of which feature 'caused' redraw
	if (!this.locked) {
//     	window.console.log('redraw ' + featureid); // changed: tells which feature 'caused' redraw
		this.clear();
		var labelMap = [];
		var feature, style;
/*		window.console.log($H(this.features).sortBy(function(pair) {
		return(pair.value[2].left);
	} ));*/
//	window.console.log($H(this.features));
/*        for (var id in this.features) {
			if (!this.features.hasOwnProperty(id)) { continue; }
			style = this.features[id][1];
			if (style.invisible) { continue; } // added line.
			feature = this.features[id][0];
			if (!feature.geometry) { continue; }
			this.drawGeometry(feature.geometry, style);
			if(style.label) {
				labelMap.push([feature, style]);
			}
		}*/
	//    window.console.log(this.map.getResolution());
	 //   window.console.log(this.features);
		// need to add on featureValue values, except accounting for difference between GIS coords and pixels
/*		$H(this.features).sortBy(function(pair) { return(pair.value[2].top + (pair.value[1].featureValue/this.map.getResolution()));} ).each(function(pair) {
			if (!this.features.hasOwnProperty(pair.key)) { return; }
			style = this.features[pair.key][1];
			if (style.invisible) { return; } // added line.
			feature = this.features[pair.key][0];
			if (!feature.geometry) { return; }
			this.drawSideGeometry(feature.geometry, style);
			if(style.label) {
				labelMap.push([feature, style]);
			}
		}.bind(this));*/
		// featureValue is what motivates the order of drawing for tops.
		var prevHeight = 0;
		var curHeight = 0;
		var featuresByHeight = $H(this.features).sortBy(function(pair) { return(pair.value[1].featureValue/this.map.getResolution());} );
		
		for(var i = 0; i < featuresByHeight.size(); i++) { // already sorted by height, shortest first.			
			var curFeature = featuresByHeight[i].value[0];
			var curStyle = featuresByHeight[i].value[1];
			prevHeight = curHeight;
			curHeight = curStyle.featureValue;
			
			for(var j = i; j < featuresByHeight.size(); j++) {
				var feature = featuresByHeight[j].value[0];
				var style = featuresByHeight[j].value[1];
				var heightLimits = {'from': prevHeight, 'to': curHeight};
				this.drawSideGeometry(feature.geometry, style, heightLimits);
//				window.console.log(heightLimits);
			}
		}
/*		featuresByHeight.each(function(pair) {
			if (!this.features.hasOwnProperty(pair.key)) { return; }
			style = this.features[pair.key][1];
			if (style.invisible) { return; } // added line.
			feature = this.features[pair.key][0];
			if (!feature.geometry) { return; }
			
			// draw the sides of all features up to this height, but only from the previous height.
			
			prevHeight = curHeight;
			curHeight = this.features[pair.key][1].featureValue;
//			window.console.log(curHeight);
			var featuresAtLeastCurHeight = $H(this.features).findAll(function(pair) {
//				window.console.log(pair.value[1].featureValue);
				return (pair.value[1].featureValue >= curHeight); // returns true if the feature is at least as tall as the one we're iterating upon.
			});
//			window.console.log($H(this.features).values().pluck('1').pluck('featureValue'));
//			window.console.log(curHeight);
			window.console.log(featuresAtLeastCurHeight.size());
	//		featuresAtLeastCurHeight.each(function(feature) {
//				this.drawSideGeometry(feature.geometry, style, {from: prevHeight, to: curHeight});
//			}.bind(this));
			
//			this.drawSideGeometry(feature.geometry, style);
//			this.drawTopGeometry(feature.geometry, style);
			if(style.label) {
				labelMap.push([feature, style]);
			}
		}.bind(this));*/
/*		$H(this.features).sortBy(function(pair) { return(pair.value[1].featureValue/this.map.getResolution());} ).each(function(pair) {
			if (!this.features.hasOwnProperty(pair.key)) { return; }
			style = this.features[pair.key][1];
			if (style.invisible) { return; } // added line.
			feature = this.features[pair.key][0];
			if (!feature.geometry) { return; }
			this.drawTopGeometry(feature.geometry, style);
			if(style.label) {
				labelMap.push([feature, style]);
			}
		}.bind(this));*/
		var item;
		for (var i=0; len=labelMap.length, i<len; ++i) {
			item = labelMap[i];
			this.drawText(item[0].geometry.getCentroid(), item[1]);
		}
	}    
};
OpenLayers.Renderer.Canvas.prototype.drawTopGeometry = function(geometry, style) {
	var className = geometry.CLASS_NAME;
	if ((className == "OpenLayers.Geometry.Collection") ||
		(className == "OpenLayers.Geometry.MultiPoint") ||
		(className == "OpenLayers.Geometry.MultiLineString") ||
		(className == "OpenLayers.Geometry.MultiPolygon")) {
		for (var i = 0; i < geometry.components.length; i++) {
			this.drawTopGeometry(geometry.components[i], style);
		}
		return;
	};
	switch (geometry.CLASS_NAME) {
		case "OpenLayers.Geometry.Point":
			this.drawPoint(geometry, style);
			break;
		case "OpenLayers.Geometry.LineString":
			this.drawLineString(geometry, style);
			break;
		case "OpenLayers.Geometry.LinearRing":
			this.drawTopLinearRing(geometry, style);
			break;
		case "OpenLayers.Geometry.Polygon":
			this.drawTopLinearRing(geometry.components[0], style);
			break;
		default:
			break;
	}
};
OpenLayers.Renderer.Canvas.prototype.drawSideGeometry = function(geometry, style, heightLimits) {
	if(!heightLimits) {return};
//	window.console.log(heightLimits);
	
	var className = geometry.CLASS_NAME;
	if ((className == "OpenLayers.Geometry.Collection") ||
		(className == "OpenLayers.Geometry.MultiPoint") ||
		(className == "OpenLayers.Geometry.MultiLineString") ||
		(className == "OpenLayers.Geometry.MultiPolygon")) {
		for (var i = 0; i < geometry.components.length; i++) {
			this.drawSideGeometry(geometry.components[i], style);
		}
		return;
	};
	switch (geometry.CLASS_NAME) {
	/*	case "OpenLayers.Geometry.Point":
			this.drawPoint(geometry, style);
			break;
		case "OpenLayers.Geometry.LineString":
			this.drawLineString(geometry, style);
			break;*/
		case "OpenLayers.Geometry.LinearRing":
			this.drawSideLinearRing(geometry, style, heightLimits);
			break;
		case "OpenLayers.Geometry.Polygon":
			this.drawSideLinearRing(geometry.components[0], style, heightLimits);
			break;
		default:
			break;
	}
};
OpenLayers.Handler.Feature.prototype.handle = function(evt) { // patch: allow clickout when nothing was previously selected.
//	var newTime = (new Date()).getTime();
	var type = evt.type;
/*	if(newTime - this.lastTime < this.interval && !(type == 'click' || type == 'dblclick')) {
		return false;
	}
	this.lastTime = newTime;
	*/
	if(this.feature && !this.feature.layer) {
		// feature has been destroyed
		this.feature = null;
	}

	var handled = false;
	var previouslyIn = !!(this.feature); // previously in a feature
	var click = (type == "click" || type == "dblclick");
	this.feature = this.layer.getFeatureFromEvent(evt);
	if(this.feature && !this.feature.layer) {
		// feature has been destroyed
		this.feature = null;
	}
	if(this.lastFeature && !this.lastFeature.layer) {
		// last feature has been destroyed
		this.lastFeature = null;
	}
	if(this.feature) {
		var inNew = (this.feature != this.lastFeature);
		if(this.geometryTypeMatches(this.feature)) {
			// in to a feature
			if(previouslyIn && inNew) {
				// out of last feature and in to another
				if(this.lastFeature) {
					this.triggerCallback(type, 'out', [this.lastFeature]);
				}
				this.triggerCallback(type, 'in', [this.feature]);
			} else if(!previouslyIn || click) {
				// in feature for the first time
				this.triggerCallback(type, 'in', [this.feature]);
			}
			this.lastFeature = this.feature;
			handled = true;
		} else {
			// not in to a feature
			if(this.lastFeature && (previouslyIn && inNew || click)) {
				// out of last feature for the first time
				this.triggerCallback(type, 'out', [this.lastFeature]);
			}
			// next time the mouse goes in a feature whose geometry type
			// doesn't match we don't want to call the 'out' callback
			// again, so let's set this.feature to null so that
			// previouslyIn will evaluate to false the next time
			// we enter handle. Yes, a bit hackish...
			this.feature = null;
		}
	} else {
		if(previouslyIn || click) { // the modified part -- call 'out' even if no lastFeature, just call it with no value.
			if(this.lastFeature) {
				this.triggerCallback(type, 'out', [this.lastFeature]);
			} else {
				this.triggerCallback(type, 'out', []);
			}
		}
	}
	return handled;
};

/*** GLOBALS ***/

var theControls = new Hash();
var theSelectedControls = new Hash();
var theHilitedControls = new Hash();
var theGraph;
var map;
//var hashLocation = new HashLocation();

var hashLocation;

var hoverDefault = '';
var hoverDefaultMap = '';
var isPanning = false; // allow us to mute features since this info not included in events themselves.

var img = new Image();
img.src = 'img/bwstripes.png';
/*var pattern;
img.onload = function() {
	pattern = 
}*/

var windowconsolenumber = 1;
var productionType = document.location.pathname.split('/').without('').last();

theControls.set('feature', new Hash());
theSelectedControls.set('feature', new Hash());

Event.observe(window, 'load', function() {
	var mapWindow = new Geogrape_Window({
		type: 'Nopadding',
		content: '<div id="map"></div>',
		style: {left: '0px', right: '150px', top: '0px', bottom: '150px'}
	});
	mapWindow.open();

	if(!window.console) {  // je suis tres tired.
		var windowconsole = new Geogrape_Window({
			style: {left: '0px', top: '50%'}
		});
		windowconsole.open();
		if(productionType == 'pulaskistproject') { // provide alternative logging iff this is 'development'
			window.console = {
				log: function(status) {
					windowconsole.update(windowconsolenumber + ': ' + status);
					windowconsolenumber++;
				}
			};
		} else {
			window.console = {
				log: function(status) {
					return false;
				}
			};
		}
		
	}
//	var theIntroScreen = new IntroScreen('introScreen', 'exit');
//	$('hoverinfo').hide();
	var updateSizes = function() {
		$('map').setStyle({
			'height':  mapWindow.getHeight() + 'px',
			'width': mapWindow.getWidth() + 'px'
		});
		if(map) {
			map.updateSize();
		}
		if(theGraph) {
			theGraph.updateSize();
			theGraph.draw();
		}
	}
	updateSizes();
	Event.observe(window, 'resize', updateSizes);
//	theIntroScreen.allowExit();
	
	OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
	// make OL compute scale according to WMS spec
	OpenLayers.DOTS_PER_INCH = 25.4 / 0.28;
	OpenLayers.zoomWheelEnabled = false;
	
	//http://trac.openlayers.org/wiki/FrequentlyAskedQuestions#ProxyHost
	OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";

	format = 'image/png';
/*	var maxBounds = new OpenLayers.Bounds(
		-8266277.389926082, 4938279.538765208,
		-8204158.984808572, 4999931.042049129
	);*/
	var maxBounds = new OpenLayers.Bounds( // bounds w/o staten island
		-8242400.000000000, 4943794.000000000,
		-8204158.984808572, 4999931.042049129
	);
	
	var geocoder = new GClientGeocoder();
	var googleBase = new OpenLayers.Layer.Google(
		"Google Map",
		{
			type: G_HYBRID_MAP,
			sphericalMercator: true
		}
	);
/*	var veBase = new OpenLayers.Layer.VirtualEarth(
		"Virtual Earth Hybrid",
		{'type': VEMapStyle.Hybrid, 'sphericalMercator': true}
	);
*/
	var absMinZoom = 19;
	var absMaxZoom = 9; // had been 11 -- this is the farthest zoom out.
	
	var options = {
		maxExtent: maxBounds,
		numZoomLevels: googleBase.RESOLUTIONS.length,
		maxResolution: googleBase.RESOLUTIONS[absMaxZoom],
		minResolution: googleBase.RESOLUTIONS[absMinZoom],
		projection: new OpenLayers.Projection("EPSG:900913"),
		units: 'm',
		controls: [/*new OpenLayers.Control.LayerSwitcher(), */new OpenLayers.Control.MousePosition({div: $('learn_column')})]
//		controls: [new OpenLayers.Control.Scale(), new OpenLayers.Control.MousePosition()]
	};
	
	map = new OpenLayers.Map('map', options);
	map.addLayer(googleBase);

	createTheGraph(map);	// draw the graph canvas. let's get a more descriptive name, folks.
	hashLocation = new HashLocation(); // Also a global.
	
	var featureControlOutlinesOverlay = new OpenLayers.Layer.Vector('featureControlOutlines');
	var featureControlInvisibleOutlinesOverlay = new OpenLayers.Layer.Vector('featureControlInvisibleOutlines'); // necessary because outlines will always be on top.  to handle events, this must be invisible.

//    featureControlInvisibleOutlinesOverlay.renderer.redraw = function() { return; }; // mute the 'redraw' function to speed things up a bit.
	map.addLayers([featureControlInvisibleOutlinesOverlay, featureControlOutlinesOverlay]);
		
	// customization of dragpan : add 'isPanning' line to keep track of when the tool is -in use-
	var defaultControl = new OpenLayers.Control.DragPan({title: 'Default'});
	defaultControl.interval = 50; // change this from 40 fps (default) to 20 fps.
	
	defaultControl.findFeatureControlAtCenter = function() {
		var mapSize = this.map.getSize();
		
		var centerLonLat = this.map.getLonLatFromPixel(new OpenLayers.Pixel(mapSize.w/2, mapSize.h/2));
		var centerPoint = new OpenLayers.Geometry.Point(centerLonLat.lon, centerLonLat.lat);
		
		var curSelectedFeatureControl = theSelectedControls.get('feature').values()[0];
		var curSelectedLevel = curSelectedFeatureControl.level;
		var curHilitedFeatureControl = theHilitedControls.values()[0];
		
		// if the bounding box of the current hilited control hits the center, just go with it fast.
		var matchingFeatureControl = theControls.get('feature').values().find( function(featureControl) {
			if(featureControl.level != curSelectedLevel) { return false; }
			var featureGeom = featureControl.feature.geometry;
			var featureBounds = featureGeom.getBounds(); // should these bounds be cached for speed?
			if(!featureBounds.containsLonLat(centerLonLat)) { return false; } // kill it if center point's not even in the bounds.
			if(featureGeom.intersects(centerPoint)) { return true; } // a more exact check
		});
		if(typeof matchingFeatureControl == 'undefined') { // why is this check necessary? bleh.
			if(curSelectedFeatureControl.parent) {
				if(curSelectedFeatureControl.parent.feature.geometry.intersects(centerPoint)) { // keep current selection if we're still in its vicinity at all.
					return curSelectedFeatureControl;
				} else {
					return curSelectedFeatureControl.parent;
				}
			} else {
				return curSelectedFeatureControl;
			}
		}
		return(matchingFeatureControl);
	};
	defaultControl.panMap = function(xy) {
//		$('hoverinfo').hide();
		setMapCursor('move'); // force panning when we're panning.
		isPanning = true; // added line.
		this.panned = true;
		this.map.pan(
			this.handler.last.x - xy.x,
			this.handler.last.y - xy.y,
			{dragging: this.handler.dragging, animate: false}
		);
		this.findFeatureControlAtCenter().hilite();
		featureControlOutlinesOverlay.redraw();
	};
	defaultControl.panMapDone = function(xy) {
		setMapCursor('default');
		if(this.panned) {
			this.panMap(xy);
			this.panned = false;
		}
		isPanning = false; // added line.
		var mapSize = this.map.getSize();
		var centerLonLat = this.map.getLonLatFromPixel(new OpenLayers.Pixel(mapSize.w/2, mapSize.h/2));
		var curSelectedLevel = theSelectedControls.get('feature').values()[0].level;
		
		var featureControlAtCenter = this.findFeatureControlAtCenter();
		if(featureControlAtCenter.level == curSelectedLevel) {
			featureControlAtCenter.zoom({noZoom: true});
		} else {
			featureControlAtCenter.zoom();
		}
/*		$('hoverinfo').setStyle({
			display: 'inline-block'
		});*/
	};
	map.addControl(defaultControl);
	defaultControl.activate();
	
	var layerSwitchControl = new OpenLayers.Control.LayerSwitcher( {
		activeColor: 'white'
	});
	
	map.zoomToMaxExtent();
	
//		OpenLayers.Handler.Feature.prototype.interval = 100;
   OpenLayers.Handler.Feature.prototype.EVENTMAP.dblclick.out = 'dblclickout'; // add the 'dblclickout' handler.
 //  OpenLayers.Handler.Feature.prototype.EVENTMAP.mousedown['in'] = 'mousedowninfeature';
	var featureControlsHandler = new OpenLayers.Handler.Feature(
		defaultControl,
		featureControlInvisibleOutlinesOverlay,
		{
//				lastTime: (new Date()).getTime(),
			over: function(feature) {
			//	window.console.log(feature.id);
				(!Status.isBusy())? feature.featureControl.hilite() : 0;
			},
			out: function(feature) { // this will not cover all unhilites -- only those triggering 'out'.  there is a second system in place with featurecontrols, but these only catch when something -else- has been hilited.
				(!Status.isBusy())? feature.featureControl.unhilite() : 0;
			},
			dblclick: function(feature) {
			//	(!Status.isBusy())? feature.featureControl.zoom({clickType: 'doubleIn'}) : 0;
			},
			dblclickout: function() { // see patching of Handler.Feature code: this will pass clickout even without a prevFeature
			//	var featureControl = theSelectedControls.get('feature').values()[0];
			//	(!Status.isBusy() && featureControl.parent) ? featureControl.parent.zoom({clickType: 'doubleOut'}) : 0;
			},
			click: function(feature) {
				window.console.log('click');
				(!Status.isBusy())? feature.featureControl.zoom({clickType: 'singleIn'}) : 0;
			},
			clickout: function() { // see patching of Handler.Feature code: this will pass clickout even without a prevFeature
				var featureControl = theSelectedControls.get('feature').values()[0];
				(!Status.isBusy() && featureControl.parent) ? featureControl.parent.zoom({clickType: 'singleOut'}) : 0;
			}
		}
	);
	featureControlsHandler.stopDown = false;
	// featureControlsHandler is activated by the featureControls at the needed times.  activating before will lead to instability (?)
	
	new MapYearControl(2008);
	
	// give useful instructions about how to use the map...
/*	map.events.register('mouseover', map, function(event) {
		if(theSelectedControls.get('feature').values()[0]) {
			if(theSelectedControls.get('feature').values()[0].level > 1) { // if we can zoom out...
		//		$('hoverinfo').hide();
		//		setMapCursor('url(img/magnipan.gif),pointer');
				setMapCursor('pointer');
			}
		}
	});
	map.events.register('mouseout', map, function(event) {
		$('hoverinfo').setStyle({
			display: 'inline-block'
		});
		$('hoverinfo').update(hoverDefault);
	});
	map.events.register('mouseout', $('leftcolumn'), function(event) {
		$('hoverinfo').update('');
		$('hoverinfo').hide();
	});
	*/
	// controls for the graph*/
	var NYCfeature = new OpenLayers.Feature.Vector(map.maxExtent.toGeometry()); // feature which encompasses whole map, for zoom purposes
	NYCfeature.fid = 'New York City';					
	NYCfeature.attributes.lotcount = 43960 + 89211 + 277837 + 322278;
		
	var NYC = new FeatureControl({
		featureType: 'NYC',
		outlinesOverlay: featureControlOutlinesOverlay,
		invisibleOutlinesOverlay: featureControlInvisibleOutlinesOverlay,
		handler: featureControlsHandler,
		parent: null, // no parent for NYC
		feature: NYCfeature // hardcoded since no request made
	});
	
	NYC.zoom();
	
	var controlWindow = new Geogrape_Window({
		style: {
			'right': '0px',
			'top': '0px',
			'width': '150px'
		}
	});
	controlWindow.open();
	
	new HiliteControl({
		map: map,
		id: 'newowners',
		name: 'Property sales',
		descriptor: 'When and where properties were purchased.',
		window: controlWindow,
		scriptCode: 11,
		colorArray: [0,0,255],
		trueByDefault: false,
		dollarCutoff: 2002,
		canBeDots: true
	});
	new HiliteControl({
		map: map,
		id: 'newmortgages',
		name: 'New mortgages',
		descriptor: 'When and where lenders made mortgages.',
		window: controlWindow,
		scriptCode: 10,
		colorArray: [0,255,0],
		trueByDefault: false,
		dollarCutoff: 1982,
		canBeDots: true
	});
	
	new HiliteControl({
		map: map,
		id: 'mortgageseizures',
		name: 'Foreclosure: property seizure',
		descriptor: 'Properties siezed in a mortgage foreclosure auction for that year.',
		window: controlWindow,
		scriptCode: 0,
		dollarCutoff: 2002,
		colorArray: [200, 0, 0],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'taxseizures',
		name: 'Abandonment: in rem foreclosure',
		descriptor: 'Properties siezed in a tax foreclosure auction for that year.',
		window: controlWindow,
		scriptCode: 1,
		dollarCutoff: 2002,
		colorArray: [150, 150, 0],
		canBeDots: true,
		trueByDefault: false
	});	
	
	new HiliteControl({
		map: map, 
		id: 'mortgagesatisfaction',
		name: 'Mortgage satisfaction',
		descriptor: 'Mortgages filed as repaid.',
		window: controlWindow,
		scriptCode: 3,
		colorArray: [0,0,200],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'mortgagereassignment',
		name: 'Mortgage resale',
		descriptor: 'Mortgages resold between mortgagees.',
		window: controlWindow,
		scriptCode: 4,
		colorArray: [200, 200, 0],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'hudowned',
		name: 'HUD-owned Properties',
		descriptor: 'Lots that taken over by HUD that year.',
		window: controlWindow,
		scriptCode: 5,
		colorArray: [150, 30,30],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'fhahudscandal',
		name: 'Properties demolished after the FHA-HUD Scandal',
		descriptor: 'Lots that were foreclosed and taken by HUD, and now stand vacant.',
		window: controlWindow,
		scriptCode: 6,
		colorArray: [30,30,150],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'showbuyer', 
		name: 'Where has [input] bought property?',
		descriptor: 'Enter in a name to hilite their purchases.',
		window: controlWindow,
		scriptCode: 7,
		dollarCutoff: 2002,
		colorArray: [30,150,30],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'showmortgagee', 
		name: 'Where has [input] made loans?',
		descriptor: "Enter in a bank's name to hilite their loans.",
		window: controlWindow,
		scriptCode: 8,
		colorArray: [30,150,150],
		dollarCutoff: 1982,
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'showId',
		name: 'What else was included in [input] document?',
		descriptor: '',
		window: controlWindow,
		scriptCode: 9,
		colorArray: [0, 60, 200],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'condos',
		name: 'Condo constructions',
		descriptor: 'Shows where and when condo declarations were made -- after 2002 only.',
		window: controlWindow,
		scriptCode: 12,
		colorArray: [100, 60, 200],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'coops',
		name: 'Cooperative apartments',
		descriptor: 'Shows where and when coops declarations were made -- after 1982 only.',
		window: controlWindow,
		scriptCode: 13,
		colorArray: [100, 200, 60],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'landmarks',
		name: 'Landmarks',
		descriptor: 'Shows where and when landmarks were designated -- after 1982 only.',
		window: controlWindow,
		scriptCode: 14,
		colorArray: [100, 100, 100],
		canBeDots: true,
		trueByDefault: false
	});
	new HiliteControl({
		map: map, 
		id: 'propertyspeculation',
		name: 'Property speculation',
		descriptor: 'Shows where and when three or more different owners purchased a property in one year.',
		window: controlWindow,
		scriptCode: 15,
		colorArray: [200, 100, 0],
		canBeDots: true,
		trueByDefault: false
	});
	
	new AddressJump({
		colorArray: [255,255,255],
		map: map,
		geocoder: geocoder,
		window: controlWindow
	});
	new RightHandControl({ // control to zoom out.
		type: 'zoomout',
		id: 'zoomout',
		name: '<b>Zoom out</b>',
		descriptor: 'Click to zoom out.',
		window: controlWindow,
		map: map,
		cannotBeSelected: true,
		onSelect: function() {
			if(theSelectedControls.get('feature').values()[0].parent) {
				theSelectedControls.get('feature').values()[0].parent.zoom();
			}
		},
		colorArray: [255,255,255]
	});
	new RightHandControl({
		type: 'animation',
		id: 'animation',
		name: 'Animate',
		descriptor: 'Click to see current overlays year-by-year.',
		window: controlWindow,
		map: map,
		cannotBeSelected: true,
		colorArray: [255,255,255],
		onSelect: function() {
			var endAnimation = function() {
				Status.unsuppress();
				this.nameDiv.update(this.name);
				this.isRunning = false;
				clearInterval(this.animation);
			}.bind(this);
			if(!this.isRunning) {
				this.isRunning = true;
				this.nameDiv.update('Animating... click to stop.');
				this.animation = setInterval(function() {
					if(theControls.get('year').get('mapYear').year < 2008) {
						Status.suppress();
						theControls.get('year').get('mapYear').nextYear();
					} else {
						endAnimation();
					}
				}.bind(this), 2000);
			} else {
				endAnimation();
			}
		}
	});
	new RightHandControl({
		type: 'url',
		id: 'url',
		name: 'Save this page',
		descriptor: 'Click here to save the settings you\'re currently viewing.',
		window: controlWindow,
		map:map,
		cannotBeSelected: true,
		colorArray: [255,255,255],
		onSelect: function() {
	//		window.console.log(window.location.hash);
	//		window.location.hash = 'bleh';
		}
	});
	
	// restore a view.
	hashLocation.evaluate();
});
