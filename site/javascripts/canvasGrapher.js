// utility functions:

function dateFromTime(time) {
	var date = new Date();
	date.setTime(time);
	return date;
}

function dePx(pxNum) {
	return pxNum.replace('px', '');
}
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var itemType = ['','OWNER', 'MORTGAGEE', 'SPECULATOR', 'RESELLER'];
var itemEndsWith = ['','SALE', 'CURRENT', 'SATISFACTION', 'FORECLOSURE', 'TRANSFER'];
// thank you to http://oregonstate.edu/cla/polisci/faculty-research/sahr/infcf17742008.pdf for inflation info.
var inflationDivisor = {
	1982: 0.451,
	1983: 0.466,
	1984: 0.486,
	1985: 0.503,
	1986: 0.512,
	1987: 0.531,
	1988: 0.553,
	1989: 0.580,
	1990: 0.611,
	1991: 0.637,
	1992: 0.656,
	1993: 0.676,
	1994: 0.693,
	1995: 0.712,
	1996: 0.734,
	1997: 0.750,
	1998: 0.762,
	1999: 0.779,
	2000: 0.805,
	2001: 0.828,
	2002: 0.841,
	2003: 0.860,
	2004: 0.883,
	2005: 0.913,
	2006: 0.942,
	2007: 0.969,
	2008: 1.007,
	2009: 1.000
};
var months = {
	1: 'January',
	2: 'February',
	3: 'March',
	4: 'April',
	5: 'May',
	6: 'June',
	7: 'July',
	8: 'August',
	9: 'September',
	10: 'October',
	11: 'November',
	12: 'December'
};
function addCommasToNumber(number) {
	number = Math.round(number); // get rid of any decimal
	var numberSplit = String(number).split('');
	for(var i = numberSplit.length-4; i >= 0; i -= 3) {
		numberSplit[i] = numberSplit[i] + ',';
	}
	return numberSplit.join('');
}
function makeNameAttractive(name) {
	if(!name) {
		return ''; // save us from 'NULL'!
	}
	if(name.length < 5) {
		return name; // it's something short and funky, don't screw around.
	}
	var wordSplit = name.split(' ');
	if(wordSplit[0].substr(wordSplit[0].length-1, 1) == ',') { // if the first word ends in a comma
		wordSplit[0] = wordSplit[0].substr(0, wordSplit[0].length - 1); // remove the comma
		wordSplit.push(wordSplit.shift()); // push it to the end.
	}
	for(var i = 0; i < wordSplit.length; i++) { // uppercase the first letter, lowercase the rest.
		if(wordSplit[i] != 'LLC' && wordSplit[i] != 'NYC' && wordSplit[i] != 'NY') {
			var lowerCaseWord = wordSplit[i].toLowerCase();
			wordSplit[i] = wordSplit[i].substr(0, 1) + lowerCaseWord.substr(1, lowerCaseWord.length - 1);
		}
		if(wordSplit[i].split('/').length > 1) {
			slashWordSplit = wordSplit[i].split('/');
			slashWordSplit[1] = slashWordSplit[1].substr(0,1).toUpperCase() + slashWordSplit[1].substr(1, slashWordSplit[1].length -1);
			wordSplit[i] = slashWordSplit.join('/');
		}
	}
	return wordSplit.join(' ');
}
function makeDateAttractive(date) {
	var year = Number(date.substr(0,4));
	var month = months[Number(date.substr(4,2))];
	var day = Number(date.substr(6,2));
	
	return month + ' ' + day + ', ' + year;
}

var Graph = Class.create();
Object.extend(Graph.prototype, {
	initialize: function(graphWindow, canvas, map) {
		this.canvas = canvas;
		this.window = graphWindow;
		this.container = $('graph_container');
		
		window.console.log(this.canvas);
		
		this.lastTime = (new Date()).getTime(); // to limit the number of mousemoves we've got
		this.interval = 50; // milliseconds min. difference in lastTime
		
		this.map = map;
		this.endDate = new Date();
		this.startDate = new Date();
				

		this.numSelectedFeatures = 0;
		
		this.context = this.canvas.getContext('2d');
		window.console.log(this.context);
		
		this.universalFont = "12pt Palatino";
		this.universalFontColor = "#000000";
		
		this.hilitedFont = "12pt Palatino";
		this.hilitedFontColor = "#000000";
		
		this.selectedFont = "12pt Palatino";
		this.selectedFontColor = "#FFFFFF";
		
		this.hilitedOutlineColor = "#FF0000";
		this.selectedOutlineColor = "#000000";
		
		this.enableEventPoints = true;
		
		this.mainAreaBackgroundColor = "#FFFFFF";
		
		this.graphTitleOffset = 15; // how far above bottom of map the graphTitle goes
		
		this.captionBottom = {};
		this.captionRight = {};
		this.captionTop = {};
		this.captionLeft = {};
		
		this.captionBottom.defaultColor = "#FFFFFF";
		this.captionBottom.hilitedColor = "#333333";
		this.captionBottom.strokeColor = "#CCCCCC";
		this.captionBottom.fontColor = "#000000";
		this.captionBottom.strokeWeight = 2;
//		this.captionBottom.height = 15;
		this.captionBottom.height = 0;
		
		this.captionRight.color = "#FFFFFF";
//		this.captionRight.width = 100;
		
		this.captionTop.color = "#FFFFFF";
		this.captionTop.height = 15; // a little space up top so that the y-axis marks don't get cut off.

		this.captionLeft.color = "#FFFFFF";
//		this.captionLeft.width = 100;
		
		this.defaultHeight = 150;
		
		this.ownerColor = 'rgba(0,0,255,.5)';
		this.mortgageColor = 'rgba(0,255,0,.5)';
		this.ownerColorLine = 'rgb(0,0,255)';
		this.mortgageColorLine = 'rgb(0,255,0)';
		this.foreclosureColor = 'rgba(255,0,0,1)';
						
		this.defaultNumOfBars = 8;
		this.numOfBars = this.defaultNumOfBars;
		this.radiusFraction = .007;
		
		this.hilitedReplaceKeys = new Hash(); // since multiple items can have one replaceKey
		
		this.titleHeight = 0; // should be linked directly
		
		this.maxAmount = {};

		this.eventInProgress = false;
		this.updateSize();
	},
/*	setData: function(newData, dataFeature, dataType, numSelectedFeatures) {
		this.numSelectedFeatures = numSelectedFeatures;
		this.numOfBars = this.defaultNumOfBars;
		
		if(this.numSelectedFeatures > 0 && newData.size() > 0) {
			if(this.dataFeature == 'lot') {
				this.divAboveCanvas.show();
				this.container.hide();
		//		this.divAboveCanvas.update(newData.inspect());

				var ownersByApt = new Array();
				var mortgagesByApt = new Array();
				
				function findDateDifference(firstDate, secondDate) {
					var firstDateArray = firstDate.split('/');
					var secondDateArray = secondDate.split('/');
					if(firstDateArray[2] != secondDateArray[2]) {
						return (secondDateArray[2] - firstDateArray[2]) + ' years';
					} else if(firstDateArray[0] != secondDateArray[0]) {
						return (secondDateArray[0] - firstDateArray[0]) + ' months';
					} else if(firstDateArray[1] != secondDateArray[1]) {
						return (secondDateArray[1] - firstDateArray[1]) + ' days';
					} else {
						return ' the same day ';
					}
				}
				function isSameParty(firstParty, secondParty) {
					firstParty = (firstParty.length > 5)? firstParty.substr(0,5) : firstParty;
					secondParty = (secondParty.length > 5)? secondParty.substr(0,5) : secondParty;
					if(firstParty.toUpperCase() == secondParty.toUpperCase()) {
						return true;
					} else {
						return false;
					}
				}
				var Mortgage = Class.create();
				Object.extend(Mortgage.prototype, {
					initialize: function(record) {
						this.id = new Array(record['id']);
						this.mortgagor = record['party1'];
						this.mortgagee = new Array(record['party2']);
						this.mortgagorInfo = record['party1info'];
						this.mortgageeInfo = new Array(record['party2info']);
						this.amount = record['amount'];
						this.divider = new Array(record['divider']);
						this.mortgageDate = new Array(record['date']);
						this.dateSequence = new Array(record['dateSequence']);
						if(!ownersByApt[record['aptnumber']]) {
							ownersByApt[record['aptnumber']] = new Array();
						}
						if(ownersByApt[record['aptnumber']].size() == 0) { // resolve that the owner is the mortgagor, but don't give it a date.
							// we have to make a new owner who created this mortgage.
							ownersByApt[record['aptnumber']].push({
								buyer: this.mortgagor,
								aptnumber: record['aptnumber'],
								dateSequence: 0,
								buyDate: 0,
								isFirst: true
							});
						}
						if(mortgagesByApt[record['aptnumber']]) {
							mortgagesByApt[record['aptnumber']].push(this);
						} else {
							mortgagesByApt[record['aptnumber']] = new Array();
							mortgagesByApt[record['aptnumber']][0] = this;
						}
					},
					reassign: function(newRecord) {
						this.id.push(newRecord['id']);
						this.mortgagee.push(newRecord['party2']);
						this.mortgageeInfo.push(newRecord['party2info']);
						this.divider.push(newRecord['divider']);
						this.mortgageDate.push(newRecord['date']);
						this.dateSequence.push(newRecord['dateSequence']);
					},
					satisfy: function(satisfactionDate) {
						this.satisfactionDate = satisfactionDate;
					}
				});
				
				newData.each(function(record) { // as this is a div, doesn't need to be modified upon resizes.
					var miniSequenceLeadingZeros = String('0000' + record[8]);
					miniSequenceLeadingZeros = miniSequenceLeadingZeros.substring(miniSequenceLeadingZeros.length - 4);
					var record = {
						id: record[0],
						aptnumber: record[1],
						type: record[2],
						party1: makeNameAttractive(record[3]),
						party2: makeNameAttractive(record[4]),
						party1info: record[5],
						party2info: record[6],
						date: record[7].split('-').join(''),
						dateSequence: record[7].split('-').join('') + miniSequenceLeadingZeros,
						amount: record[9],
						divider: record[10]
					};
					var curApt = record['aptnumber'];
					if(!mortgagesByApt[curApt]) {
						mortgagesByApt[curApt] = new Array();
					}
					if(record['type'] == 'DEED' || record['type'] == 'DEED, OTHER') {
						var newOwner = {
							id: record['id'],
							aptnumber: record['aptnumber'],
							buyer: record['party2'],
							seller: record['party1'],
							amount: record['amount'],
							divider: record['divider'],
							buyDate: record['date'],
							dateSequence: record['dateSequence']
						};
						if(Number(newOwner.id) == newOwner.id && newOwner.amount < 100) {
							newOwner.buyType = 'GIFT';
						} else if(record['party1info'] == 'financecommish') {
							newOwner.buyType = 'TAXFORECLOSURE';
						} else if(record['party1info'] == 'referee') {
							newOwner.buyType = 'MORTGAGEFORECLOSURE';
						} else if(record['party1info'] == 'dead') {
							newOwner.buyType = 'WILL';
						} else {
							newOwner.buyType = 'SALE';
						}
						if(!ownersByApt[curApt]) {
							ownersByApt[curApt] = new Array();
						}
						if(ownersByApt[curApt].size() > 0) {
							ownersByApt[curApt][ownersByApt[curApt].size()-1].sellType = newOwner.buyType;
							ownersByApt[curApt][ownersByApt[curApt].size()-1].sellDate = newOwner.buyDate;
							if(ownersByApt[curApt][ownersByApt[curApt].size()-1].seller != newOwner.buyer) {
								newOwner.buyJump = true;
								ownersByApt[curApt][ownersByApt[curApt].size()-1].sellJump = true;
							}
						} else {
							if(record['party1info'] != 'dead' && record['party1info'] != 'financecommish' && record['party1info'] != 'referee' ) {
								ownersByApt[curApt].push({
									aptnumber: curApt,
									buyer: newOwner.seller,
									dateSequence: 0,
									buyDate: 0,
									isFirst: true
								});
							} else {
								newOwner.isFirst = true;
							}
						}
						ownersByApt[curApt].push(newOwner);
					} else if(record['type'] == 'MORTGAGE') { // a regular mortgage -- make a new one
						new Mortgage(record);
					} else if(record['type'] == 'ASSIGNMENT, MORTGAGE') { // a mortgage reassignment
						var assignedMortgages = mortgagesByApt[curApt].findAll( function(mortgage) {
							return isSameParty(mortgage.mortgagee.last(), record['party1']); // will not return all, misspellings etc.
						});
						if(assignedMortgages.size() == 0) { // if no returns, see if there's any mers action within the last six months.
							assignedMortgages = mortgagesByApt[curApt].findAll( function(mortgage) {
								return (record['date'] - mortgage.mortgageDate.last() < 600 && mortgage.mortgageeInfo.last() == 'mers'); // 
							});
						}
						switch(assignedMortgages.size()) {
							case 0: // reassigning a nonexistent mortgage
								var artificialRecord = record;
								artificialRecord.party2 = artificialRecord.party1;
								if(!ownersByApt[curApt]) {
									ownersByApt[curApt] = new Array();
								}
								if(ownersByApt[curApt].size() > 0) {
									artificialRecord.party1 = ownersByApt[curApt].last().buyer;
								} else {
									artificialRecord.party1 = 'Unknown owner ';
								}
								new Mortgage(artificialRecord);
								mortgagesByApt[curApt].last().reassign(record);
								break;
							case 1: // only one possible mortgage to assign, do it.
								assignedMortgages[0].reassign(record);
								break;
							default: // more than one!  Right now, let's just do the same as 'case 1' though...
								assignedMortgages[0].reassign(record);
								break;
						}
					} else if(record['type'] == 'SATISFACTION OF MORTGAGE') { // a mortgage satisfaction
						var satisfiedMortgages = mortgagesByApt[curApt].findAll( function(mortgage) {
							if(mortgage.satisfactionDate) { return false; } // already satisfied.
							return isSameParty(mortgage.mortgagee[0], record['party2']); // will not return all, misspellings etc.
						});
						switch(satisfiedMortgages.size()) {
							case 0: // satisfying a nonexistent mortgage
								new Mortgage(record);
								mortgagesByApt[curApt].last().satisfy(record['date']);
								break;
							case 1: // satisfaction for one mortgage
								satisfiedMortgages[0].satisfy(record['date']);
								break;
							default: // multiple possible satisfied mortgages
								satisfiedMortgages[0].satisfy(record['date']);
								break;
						}
					}
				});
				var descString = '';
				
				// display code.
				ownersByApt.each(function(owners) {
					var curApt = owners[0].aptnumber;
					owners.each(function(owner) {
				//		descString += (owner.id) ? '<a target="_blank" href="http://a836-acris.nyc.gov/Scripts/DocSearch.dll/ViewImage?Doc_ID=' + owner.id + '">' : '';
						var buyYear;
						if(!owner.buyDate) {
							buyYear = 1966;
						} else {
							buyYear = owner.buyDate.substr(0,4);
						}
						var buyerSpan = '<span class="lothilitelink" onclick="theControls.get(\'hilite\').get(\'showbuyer\').forceValue(\'' + owner.buyer + '\', ' + buyYear + ')">' + owner.buyer + '</span>'
						if(!owner.seller && owner.isFirst) {
							descString += 'It was initially owned by ' + buyerSpan;
						} else if(owner.isFirst) { // ONLY if this is the very first one.
							switch(owner.buyType) {
								case 'GIFT': // this technically should never happen, because a previous record would be made.
									descString += buyerSpan + ' received it from ' + owner.seller;
									break;
								case 'TAXFORECLOSURE':
									descString += buyerSpan + ' obtained it for nonpayment of taxes ';
									break;
								case 'MORTGAGEFORECLOSURE':
									descString += buyerSpan + ' obtained it in a foreclosure auction';
									break;
								case 'WILL':
									descString += buyerSpan + ' was willed it';
									break;
								case 'SALE': // this technically should never happen, because a previous record would be made
									descString += buyerSpan + ' purchased it from ' + owner.seller;
									break;
								default:
							}
						} else {
							descString += buyerSpan;
						}
						descString += (owner.buyDate)? (' on ' + makeDateAttractive(owner.buyDate)) : '';
						
						var ownerDividerSpan = '<span class="lothilitelink" onclick="theControls.get(\'hilite\').get(\'showId\').forceValue(\'' + owner.id + '\', ' + buyYear + ')">tandem with ' + owner.divider + '</span>'

						descString += (Number(owner.divider) > 1)? (' in ' + ownerDividerSpan + ' other properties') : '';
						descString += (Number(owner.amount) > 100)? (' for $' + addCommasToNumber(owner.amount)) : '';
			//			descString += (owner.id) ? '</a>' : '';
						descString += '. ';
						if(mortgagesByApt[curApt]) {
							var mortgages = mortgagesByApt[curApt];
							var mortgagesForThisOwner = mortgages.findAll( function(mortgage) {
								if(Number(mortgage.mortgageDate[0]) < Number(owner.buyDate)) { return false; }
								return isSameParty(mortgage.mortgagor, owner.buyer);
							});
							if(mortgagesForThisOwner.size() > 0) {
								mortgagesForThisOwner = mortgagesForThisOwner.sortBy( function(mortgage) {
									return mortgage.dateSequence[0];
								}); // lowest comes first.
								
								mortgagesForThisOwner.each( function(mortgage) {
									for(var i = 0; i < mortgage.mortgageDate.size(); i++) {
										var mortgageeSpan = '<span class="lothilitelink" onclick="theControls.get(\'hilite\').get(\'showmortgagee\').forceValue(\'' + mortgage.mortgagee[i] + '\', ' + mortgage.mortgageDate[i].substr(0,4) + ')">' + mortgage.mortgagee[i] + '</span>'

										descString += (i == 0)? (' It was mortgaged to ' + mortgageeSpan) : (', who sold the mortgage to ' + mortgageeSpan);

										var mortgageDividerSpan = '<span class="lothilitelink" onclick="theControls.get(\'hilite\').get(\'showId\').forceValue(\'' + mortgage.id[i] + '\', ' + mortgage.mortgageDate[i].substr(0,4) + ')">tandem with ' + mortgage.divider[i] + '</span>'

										descString += (Number(mortgage.divider[i]) > 1)? (' in ' + mortgageDividerSpan + ' other properties') : '';
										descString += (i == 0 && Number(mortgage.amount) > 100)? (' for $' + addCommasToNumber(mortgage.amount)) : '';
										descString += (Number(mortgage.mortgageDate[i]) == 0)? ' before 1966' : (' on ' + makeDateAttractive(mortgage.mortgageDate[i]));
									}
									descString += (mortgage.satisfactionDate)? (' and was satisfied on ' + makeDateAttractive(mortgage.satisfactionDate)) : '';
								});
							}
							descString += '.<br>';
		
							switch(owner.sellType) {
								case 'GIFT':
									descString += ' It was given to ';
									break;
								case 'TAXFORECLOSURE':
									descString += ' It was taken for nonpayment of taxes by ';
									break;
								case 'MORTGAGEFORECLOSURE':
									descString += ' lt was foreclosed on for nonpayment of a mortgage, and purchased at auction by ';
									break;
								case 'WILL':
									descString += ' It was willed to ';
									break;
								case 'SALE':
									descString += ' It was sold to ';
									break;
								default:
									if(owner.isFirst) {
										descString += ' It was sold to ';
									}
									break;
							}
						}
					});
				});
				this.divAboveCanvas.update(descString);
				
			}
		}

		this.setGraphMode();
	},*/
	setGraphMode: function() {
		this.graphMode = 1966;
		
		startYear = this.graphMode;

		if(startYear == 1966) {
			this.newOwners = 'numberNewOwners';
			this.amountForOwners = 'numberAmount';
			this.offsetForOwners = 'numberOffset';
			this.maxAmountForOwners = 'number';
			
			this.newMortgagees = 'numberNewMortgagees';
			this.amountForMortgagees = 'numberAmount';
			this.offsetForMortgagees = 'numberOffset';
			this.maxAmountForMortgagees = 'number';
		} else if(startYear == 1982) {			
			this.newOwners = 'numberNewOwners';
			this.amountForOwners = 'numberAmount';
			this.offsetForOwners = 'numberOffset';
			this.maxAmountForOwners = 'number';
			
			this.newMortgagees = 'dollarNewMortgagees';
			this.amountForMortgagees = 'dollarAmount';
			this.offsetForMortgagees = 'dollarOffset';
			this.maxAmountForMortgagees = 'dollar';
		} else if(startYear == 2003) {			
			this.newOwners = 'dollarNewOwners';
			this.amountForOwners = 'dollarAmount';
			this.offsetForOwners = 'dollarOffset';
			this.maxAmountForOwners = 'dollar';
			
			this.newMortgagees = 'dollarNewMortgagees';
			this.amountForMortgagees = 'dollarAmount';
			this.offsetForMortgagees = 'dollarOffset';
			this.maxAmountForMortgagees = 'dollar';
		}

		this.startDate = new Date();
		this.endDate = new Date();
		
		var endYear = 2008;
		this.startDate.setUTCFullYear(startYear, 0, 1);
		this.endDate.setUTCFullYear(endYear, 11, 31);
		
		this.startTime = this.startDate.getTime(); // cache for speed.
		this.endTime = this.endDate.getTime();
		this.timeRange = this.endTime - this.startTime;
		this.pxTimeRatio = this.mainArea.width/this.timeRange;
	},
	setGraphSize: function(newWidth, newHeight) {
		this.canvas.width = newWidth;
		this.canvas.height = newHeight;
		
		this.canvas.style.width = newWidth + 'px';
		this.canvas.style.height = newHeight + 'px';
				
		this.container.style.width = newWidth + 'px';
		this.container.style.height = newHeight + 'px';
		
		if(this.context.fillText) {
			this.context.font = this.universalFont;
		} else if(this.context.mozDrawText) {
			this.context.mozTextStyle = this.universalFont;
		}
		this.captionRight.width = (this.captionRight.width)? this.captionRight.width : 0;
		this.captionLeft.width = (this.captionLeft.width)? this.captionLeft.width : 0;
		
		this.mainArea = {};
		this.mainArea.width = newWidth - (this.captionLeft.width + this.captionRight.width);
		this.mainArea.height = newHeight - (this.captionBottom.height + this.captionTop.height);
		this.mainArea.top = this.captionTop.height;
		this.mainArea.left = this.captionLeft.width;
		
		this.pxTimeRatio = this.mainArea.width/this.timeRange;
	},
	
	drawBackground: function() {
		this.context.save();
		
		this.context.fillStyle = this.mainAreaBackgroundColor;
		this.context.fillRect(this.mainArea.left, this.mainArea.top, this.mainArea.width, this.mainArea.height);
				
		this.context.restore();
	},
	drawKey: function() {
		this.context.save();		
		this.context.restore();
	},
	drawCaptionBottom: function() {
		this.context.save();
		
		this.captionBottom.top = this.canvas.height- this.captionBottom.height;
		
		this.context.fillStyle = this.captionBottom.defaultColor;
		this.context.strokeStyle = this.captionBottom.strokeColor;
		this.context.lineWidth = this.captionBottom.strokeWeight;
		
		this.context.fillRect(0, this.captionBottom.top, this.canvas.width, this.captionBottom.height);
		this.context.restore();
	},
	drawCaptionRight: function() { // doesn't take top into account
		this.context.save();
				
		this.captionRight.left = this.canvas.width-this.captionRight.width;
		this.captionRight.height = this.canvas.height-this.captionBottom.height;
		
		this.context.fillStyle = this.captionRight.color;
		this.context.fillRect(this.captionRight.left, 0, this.captionRight.width, this.captionRight.height);
		
		this.context.restore();
	},
	drawCaptionTop: function() {
		this.context.save();
		
		this.context.fillStyle = this.captionTop.color;
		this.context.fillRect(0, 0, this.canvas.width, this.captionTop.height);
		
		this.context.restore();
	},
	drawCaptionLeft: function() { // doesn't take top into account
		this.context.save();
				
		this.captionLeft.left = 0;
		this.captionLeft.height = this.canvas.height-this.captionBottom.height;
		
		this.context.fillStyle = this.captionLeft.color;
		this.context.fillRect(this.captionLeft.left, this.captionLeft.width, this.captionLeft.width, this.captionLeft.height);
		
		this.context.restore();
	},
	drawXAxis: function() {
		this.context.save();
		
		this.context.strokeStyle = "rgba(0,0,0,.5)";
		this.context.fillStyle = this.universalFontColor;
		
		if(this.context.fillText) {
			this.context.font = this.universalFont;
			this.context.textAlign = "center";
			this.context.textBaseline = "top";
		} else if(this.context.mozDrawText) {
			this.context.mozTextStyle = this.universalFont;
		}
		
		var yearRange = (this.endDate.getUTCFullYear() - this.startDate.getUTCFullYear()) + 1; // inclusive.
		var yearWidth = this.mainArea.width/yearRange;
		
		
		$R(this.startDate.getUTCFullYear(), this.endDate.getUTCFullYear()).each(function(year) {
			
			var yearTime = Date.UTC(year, 0, 1);
			
			this.context.beginPath();
			this.context.moveTo(this.xFromTime(yearTime) + this.mainArea.left, this.mainArea.top);
			this.context.lineTo(this.xFromTime(yearTime) + this.mainArea.left, this.mainArea.height + this.mainArea.top);
			this.context.stroke();
			
			if(year == theControls.get('year').get('mapYear').year) {
				this.context.fillStyle = '#000000';
				this.context.fillRect(this.xFromTime(yearTime) + this.mainArea.left, 0, yearWidth, this.mainArea.top);
				this.context.fillStyle = this.selectedFontColor;
			}
			this.context.fillStyle = this.universalFontColor;
			if(this.context.fillText) {
				this.context.font = this.universalFont;
				this.context.fillText('\'' + String(year).substr(2,2), this.xFromTime(yearTime) + this.mainArea.left + (yearWidth/2), 0);
			} else if(this.context.mozDrawText) {
//				this.context.transform(this.xFromTime(yearTime) + this.mainArea.left + (yearWidth/2), 0);
				this.context.mozTextStyle = this.universalFont;
//				this.context.mozDrawText('\'' + String(year).substr(2,2));
				this.context.mozDrawText('bleh');
				window.console.log(this.universalFont);
//				this.context.transform(-1*(this.xFromTime(yearTime) + this.mainArea.left + (yearWidth/2)), 0);
			}
		}, this);
		
		this.context.restore();
	},
	drawYAxis: function() {
		this.context.save();
		
		this.context.strokeStyle = "rgba(0,0,0,.25)";
		if(this.context.fillText) {
			this.context.textBaseline = "middle";
			this.context.font = this.universalFont;
		} else if(this.context.mozDrawText) {
			this.context.mozTextStyle = this.universalFont;
		}
		this.context.fillStyle = this.universalFontColor;
		
/*		if(this.graphMode == 1966 || this.graphMode == 1982) { // draw the number amounts -- not mutually exclusive
			this.context.textAlign = "right";
			$R(0, this.numOfBars - 1).each(function(bar) {
				var heightPerBar = ((bar-this.separateOwnersFromMortgagees)/this.numOfBars);
				var amountHeight = heightPerBar * this.mainArea.height;

				this.context.beginPath();
				this.context.moveTo(this.mainArea.left, amountHeight + this.mainArea.top);
				this.context.lineTo(this.mainArea.left + this.mainArea.width, amountHeight + this.mainArea.top);
				this.context.stroke();
				
				var mortgageeNumber = Math.ceil(-(this.maxAmount.number * (bar - this.numOfBars)/this.numOfBars));
				var numberText = addCommasToNumber(mortgageeNumber);
				if(this.context.fillText) {
					this.context.fillText(numberText, this.mainArea.left, amountHeight + this.mainArea.top);
				}
			}, this);
		}
		if(this.graphMode == 2003 || this.graphMode == 1982) { // draw the dollar amounts -- not mutually exclusive!
			this.context.textAlign = "left";
			$R(0, this.numOfBars-1).each(function(bar) {
				var heightPerBar = (bar-((this.separateOwnersFromMortgagees > 0)? 1 : 0))/this.numOfBars;
				var amountHeight = heightPerBar * this.mainArea.height;
				
				this.context.beginPath();
				this.context.moveTo(this.mainArea.left, amountHeight + this.mainArea.top);
				this.context.lineTo(this.mainArea.width + this.mainArea.left, amountHeight + this.mainArea.top);
				this.context.stroke();
				
				var amountRounded = Math.ceil(this.maxAmount.dollar / 10000) * 10000;
				amountRounded = String(amountRounded).replace(/\.\d*$/, ''); // since the ceil() function often messes up...
				var amountDollarized = '$' + addCommasToNumber(-(Number(amountRounded) * (bar - this.numOfBars)/this.numOfBars));
				if(this.context.fillText) {
					this.context.fillText(amountDollarized, this.mainArea.width + this.mainArea.left, amountHeight+ this.mainArea.top);
				}
			}, this);
		}*/
		
		this.context.restore();
	},
	drawEmptyGraph: function() {
		this.context.save();
		
		this.context.restore();
	},
	drawData: function() {
		this.context.save();

		if(theSelectedControls.get('hilite')) {
			theSelectedControls.get('hilite').each( function(pair) {
				this.context.save();
				if(this.graphMode >= pair.value.dollarCutoff) {
					var valueType = 'dollar';
				} else {
					var valueType = 'number';
				}
				this.context.save();
				this.context.strokeStyle = pair.value.color;
				this.context.lineWidth = 1.5;
				this.context.beginPath();
				for(var curYear = 1966; curYear <= 2008; curYear++) {
					var xPos = this.xFromDate(curYear + '-7-1') + this.mainArea.left; // draw in the middle.
					if(!pair.value.dataForSelectedFeature[curYear]) { // draw a zero value.
						var height = this.mainArea.height;
					} else {
						var height = (1-(pair.value.dataForSelectedFeature[curYear][valueType]/pair.value.maxValueForSelectedFeature[valueType]))*this.mainArea.height;
					}
					if(curYear == 1966) { // start with no trailing line at beginning.
						this.context.moveTo(xPos, height + this.mainArea.top);
					} else {
						this.context.lineTo(xPos, height + this.mainArea.top);
					}
				}
				this.context.stroke();
				this.context.restore();
			}, this);
		}
		$R(1966,2008).each(function(year) {
			var startXPos = this.xFromDate(year + '-0-1') + this.mainArea.left;
			var endXPos = this.xFromDate(year + '-11-31') + this.mainArea.left;
			
			if(theControls.get('year').get('mapYear').year == year) {
				this.context.strokeStyle = this.selectedOutlineColor;
				this.context.lineWidth = 2;
				this.context.strokeRect(startXPos+1, this.mainArea.top, endXPos-(startXPos+2), this.mainArea.height);
			}
			if(this.hilitedYear == year) {
				this.context.lineWidth = 1;
				this.context.strokeStyle = this.hilitedOutlineColor;
				this.context.strokeRect(startXPos+.5, this.mainArea.top, endXPos-(startXPos+1), this.mainArea.height);
				this.context.strokeRect(startXPos+.5, 0, endXPos-(startXPos+1), this.mainArea.top);
				
				var lotcount = theSelectedControls.get('feature').values().pluck('feature').pluck('attributes').pluck('lotcount')[0];
				
				var selectedFeatureNames = theSelectedControls.get('feature').values().pluck('descriptor');
				selectedFeatureNames = selectedFeatureNames.join(', ');
				
				var textLines = new Array();
				
				theSelectedControls.get('hilite').each(function(pair) {
					if(pair.value.dataForSelectedFeature[year]) { // if this data exists...
						var hiliteInfo = '<span style="color:' + pair.value.color + '">' + addCommasToNumber(pair.value.dataForSelectedFeature[year].number) + ' ' + pair.value.title();
						if(pair.value.dollarCutoff < Number(year)) {
							hiliteInfo += ' for $' + addCommasToNumber(OpenLayers.Number.limitSigDigs(pair.value.dataForSelectedFeature[year].dollar, 3));
						}
						var leadingPartys = pair.value.dataForSelectedFeature[year].partys.sortBy(
							function(pair) {
								return -pair[1].number;
							}
						);
						var maxParties = ((leadingPartys.size() > 3) ? 3 : leadingPartys.size());
						for(var i = 0; i < maxParties; i++) {
							hiliteInfo += '<br>#' + (i+1) + ': ' + leadingPartys[i].key + ', ' + addCommasToNumber(leadingPartys[i].value.number);
						}
						hiliteInfo += '</span>';
						textLines.push(hiliteInfo);
					}
				}, this);
/*				$('hoverinfo').setStyle({
					display: 'inline-block'
				});
				$('hoverinfo').update(textLines.join('<br><li>'));*/
			}
		}, this);
		this.context.restore();
	},
	drawTitle: function() {
		if(theSelectedControls.get('hilite') && theSelectedControls.get('feature')) {
			var selectedHiliteModes = theSelectedControls.get('hilite').values().invoke('title');
			var selectedModes = selectedHiliteModes.join(', ');
			var selectedFeatures = theSelectedControls.get('feature').values().pluck('descriptor').join(', ');
			this.window.updateTitle(selectedModes + ' for ' + selectedFeatures + ' in ' + theControls.get('year').get('mapYear').year);
		}
	},
	updateSize: function() {
		this.canvas.setStyle({
			top: this.map.getSize().h + 'px',
			left: '0px'
		});
		this.container.setStyle({ // for the benefit of IE, copy manually.
			top: this.map.getSize().h + 'px',
			left: '0px'
		});
		this.setGraphSize(this.window.getWidth(), this.window.getHeight());
	},
	draw: function() {		
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		this.drawBackground();
		this.drawTitle();
		this.setGraphMode();
		
		if(theSelectedControls.get('hilite')) {
			this.drawData();
			
			this.drawXAxis();
			this.drawYAxis();
		} else {
			this.drawEmptyGraph();
		}	
		// position the divAboveCanvas after its content has been set by the above
		
//		this.titleDiv.style.left = ((this.map.getSize().w/2) - (this.titleDiv.getWidth()/2)) + 'px';
//		this.titleDiv.style.top = (this.map.getSize().h - (this.titleDiv.getHeight() + this.graphTitleOffset)) + 'px';

	},
	timeFromX: function(x) {
		var timeRange = (this.endDate.getTime()-this.startDate.getTime())
	
		return (x*timeRange/this.mainArea.width) + this.startDate.getTime();
	},
	xFromDate: function(date) {
		var dateArray = date.split('-');
		
		var time = Date.UTC(dateArray[0], dateArray[1], dateArray[2]);
		
		return this.xFromTime(time);
	},
	xFromTime: function(time) { // time varies, x is fixed...		
		return (time - this.startTime) * this.pxTimeRatio;
	},
	clickedOn: function(event) {
		if(this.eventInProgress == false && !Status.isBusy()) { // don't handle multi-clicks			
			var dateClicked = dateFromTime(this.timeFromX(event.clientX - this.mainArea.left));
			theControls.get('year').get('mapYear').changeYear(dateClicked.getUTCFullYear());
		}
	},
	
	movedOver: function(event) {
		if(this.eventInProgress == false  && !Status.isBusy()) {
			var left = Number(this.container.style.left.replace('px', ''));
			var top = Number(this.container.style.top.replace('px', ''));
			var xFraction = (event.pointerX()-left - this.mainArea.left)/this.mainArea.width;
			var yFraction = (event.pointerY()-top - this.mainArea.top)/this.mainArea.height;
				
			if(xFraction <= 1 && yFraction <= 1) {
				// do hiliting through the draw function

				var thingsDoneChanged = false;
				var somethingIsHilited = false;
				$R(1966,2008).each( function(year) {
					itemXLeftFraction = (this.xFromTime(Date.UTC(year, 0, 1)) + 0)/this.mainArea.width;
					itemXRightFraction = (this.xFromTime(Date.UTC(year, 11, 31)) + 0)/this.mainArea.width;
					if(
						itemXLeftFraction < xFraction &&
						itemXRightFraction > xFraction
					) {
						if(year != this.hilitedYear) {
							thingsDoneChanged = true;
						}
						this.hilitedYear = year;
						somethingIsHilited = true;
					}
				}, this);
				if(somethingIsHilited) { // give us a pointer if something is highlighted.
				// movedOver is voided out when Status is busy, so don't have to worry bout invalidating that.
					this.container.setStyle({cursor: 'pointer'});
				} else {
					this.container.setStyle({cursor: 'default'});
				}
				
				if(thingsDoneChanged) {
					this.draw();
				}

			} else {
				this.hilitedYear = null;
				this.movedOut();
			}
		}
	},
	
	movedOut : function(event) {
		this.hilitedYear = null;
		this.draw();
	},
	setBusy: function() {
		this.container.setStyle({
			cursor: 'progress'
		});
	},
	clearBusy: function() {
		this.container.setStyle({
			cursor: 'default'
		});
	}
});

function createTheGraph(map) {
	var graphWindow = new Geogrape_Window({
		content: '<div id="graph_container"></div>',
		type: 'Bottomnonmodal',
		style: {
			'left': '0px',
			'right': '150px',
			'bottom': '0px',
			'height': '150px'
		}
	});
	graphWindow.open();
	

	var canvas = document.createElement("canvas");
	graphWindow.insert(canvas);

	if(canvas.getContext) {
		theGraph = new Graph(graphWindow, canvas, map);
		
		theGraph.draw();
		// observe the container instead of the canvas, as observing a canvas is buggy in IE
		Event.observe(theGraph.container, 'click', function(event) { theGraph.clickedOn(event); } );
		Event.observe(theGraph.container, 'mouseover', function(event) {
			theGraph.movedOver(event);
		});
		Event.observe(theGraph.container, 'mousemove', function(event) {
			var newTime = (new Date()).getTime();
			if(newTime - theGraph.lastTime > theGraph.interval) { // limit our framerate for slower computers.
				theGraph.movedOver(event);
				theGraph.lastTime = newTime;
			}
		});
		Event.observe(theGraph.container, 'mouseout', function(event) {
			theGraph.movedOut(event);
		});
		
	} else {
		this.window.update('You must have a canvas-supporting browser to use the graph.');
	//	$(canvasId + '_title').update('You must have a canvas-supporting browser to use the graph.');
		// canvas not supported.
	}
}

