#!/usr/bin/perl -w

#use strict;

open STDERR, '>>errlog.txt';
print STDERR "_________________\n";

# This script takes as input a JSON string requesting a certain data set.
# In order to avoid extra SQL requests, all sorts of data requests must be encompassed.

######	REQUEST DATA FORMAT	######
#	<requestNode>:	{
#						'id': 'newmortgages',
#						'values': {
#						       <key>:<value,...
#						}
#					}
#	new request data format:
#		{
#                       'zoom': 'tract|city', # control whether we pull up properties or tract values.
#			'tracts': [
#                           '103-2000', '103-2001' # the features visible on the display, can be used as a limiter no matter what.
#			],
#			'dates': [196601,196612], # the date range for map (inclusive)
#	                'filter': {
#                           'type': 'mortgage',
#                           'values': { # with all these, if omitted assume 'all'.
#                                'from': [], # corresponds to party1concat
#                                'to': ['citibank',...], # corresponds to party2concat
#                                'zoning': [] 
#                           },
#                           'then': [
#                                {
#                                    'type': 'foreclosure',
#                                    'after': [1,1000] # the date range limit, in days
#                                    'values': {},
#                                    'then': [{}, {}, {}]
#                                }    
#                           ]
#                       }
#                       'counterFilter: {
#                       }
#               }

use Archive::Zip qw( :ERROR_CODES );

use DBI;
use JSON::XS;
use CGI qw/:standard/;
use Math::Trig;
use Geogrape qw($valueDefs %subboroughs $database $user $password $graphs $overlays $piecharts &checkRequest @dataTypes &filterRequestId &timedRequestId &untimedRequestId);

use strict;

my $query = new CGI;

print header;

my $request = &decode_json($query->param('requestJSON')) or die('Invalid JSON.');
#my $request = decode_json($sampleRequest2) or die('Invalid JSON.');

#my $zoom = $request->{'zoom'};
&checkRequest($request);

my ($filterRequestIdRef, $timedRequestIdRef, $untimedRequestIdRef, $filterJSONRef, $filterRef) = ([],[],[],[],[],[]);
#my ($filterRequestIdRef, $timedRequestIdRef, $untimedRequestIdRef, $requestJSONRef, $requestNamesRef, $requestColorsRef, $requestIcons) = ([],[],[],[],[],[]); # timed for maps & piecharts, untimed for graphs.

foreach my $i (0..$#{$request->{'filter'}}) {
#    print STDERR "supplemental: $request->{'supplemental'}\n";

   $filterRef->[$i] = $request->{'filter'}->[$i];
   $filterJSONRef->[$i] = &encode_json($request->{'filter'}->[$i]); # must be done before filterRequestId because that will strip certain components of the request.

   $filterRequestIdRef->[$i] = &filterRequestId($request->{'filter'}->[$i], $request->{'supplemental'});
   $untimedRequestIdRef->[$i] = &untimedRequestId($filterRequestIdRef->[$i], $request);
   $timedRequestIdRef->[$i] = &timedRequestId($filterRequestIdRef->[$i], $request);
}

my $types = {
  'mortgage'=> {
    'table'=>'records_mortgages_deriv'
  },
  'purchase'=> {
    'table'=>'records_deeds_deriv',
    'limit'=>'info IS NULL'  # make sure that we don't include foreclosures & in rem in the purchase count.
# unfortunately, this still includes all the finance commish -> NYC property transfers where there was a later vacate order.
  },
  'foreclosure'=>{
    'table'=>'records_deeds_deriv',
    'limit'=>'info = "foreclosure"'
  },
  'abandonment'=> {
    'table'=>'records_deeds_deriv',
    'limit'=>'info = "inrem"'
  },
  'mortgagesatisfaction'=> {
    'table'=>'records_satisfactions_deriv'
  },
  'mortgageresale'=> {
    'table'=>'records_assignments_deriv'
  },
 'jobs'=> {
    'table' => 'deltanewyorkjobs'
  }
};

sub findPrevFilterOfType { # find a prevFilter of a certain type (from list).  returns an empty variable if there is none.
    my ($filter, @types) = @_;
    foreach my $type (@types) {
#	print STDERR $filter->{'type'}."\n";
	if($filter->{'type'} eq $type) {
	    return $filter;
	}
    }
    if($filter->{'prevFilter'}) {
	$filter = &findPrevFilterOfType($filter->{'prevFilter'}, @types);
    } else { # failure: no matches, no previous filters.
	$filter = 0;
    }
    return $filter;
}
sub findInitialFilterOfType {
    my ($filter, @types) =@_;
    if($filter->{'id'} ne '_1') {
	&findInitialFilterOfType($filter->{'prevFilter'}, @types);
    } else {
	foreach my $type (@types) {
	    if($filter->{'type'} eq $type) {
		return $filter;
	    }
	}
	return 0;
    }
}

my $components = {
    'list' => sub {
	my ($filter, $valueName) = splice(@_, 0, 2);
	my $equalityType;
	if($valueDefs->{$valueName}->{'type'} eq 'text') {
	    $equalityType = 'LIKE';
	} elsif($valueDefs->{$valueName}->{'type'} eq 'number') {
	    $equalityType = '=';
	}
	my $columnName = $valueDefs->{$valueName}->{'columnName'};
	my @statements;
	foreach my $value (@_) {
	    push(@statements, "$filter->{'id'}.$columnName $equalityType '%$value%'") if($equalityType eq 'LIKE');
	    push(@statements, "$filter->{'id'}.$columnName $equalityType '$value'") if ($equalityType eq '=');
	}
	return '('.join(' OR ', @statements).')';
    },
#    'equalList' => sub { return &{$components->{'list'}}(@_[0..2], '=', @_[3..$#_]); },
#    'likeList' => sub { return &{$components->{'list'}} (@_[0..2], 'LIKE', @_[3..$#_]); },
    'range' => sub {
#	my ($tableId, $columnName, $bottom, $top) = splice(@_, 0,4);
	my ($filter, $valueName, $bottom, $top) = splice(@_, 0,4);
	if($bottom && $top) {
	    return "$filter->{'id'}.$valueDefs->{$valueName}->{'columnName'} BETWEEN $bottom AND $top";
	} elsif ($bottom && !$top) {
	    return "$filter->{'id'}.$valueDefs->{$valueName}->{'columnName'} > $bottom";
	} elsif (!$bottom && $top) {
	    return "$filter->{'id'}.$valueDefs->{$valueName}->{'columnName'} < $top";
	}
    },
    'initial' => sub {
#	my ($columnName, $filter, $prevTableTypes, $initialColumnName) = @_;
	my ($filter, $valueName, $initialTableTypes, $initialValueName) = @_;
	if(!$filter->{'prevFilter'}) {
	    print STDERR "No previous filter -- mistake in creating request.\n";
	    return;
	}
	my $initialFilter = &findInitialFilterOfType($filter->{'prevFilter'}, split(',',$initialTableTypes));
	if($initialFilter) {
	    return "$initialFilter->{'id'}.$valueDefs->{$initialValueName}->{'columnName'} = $filter->{'id'}.$valueDefs->{$valueName}->{'columnName'}";
	} else {
	    print STDERR "Initial filter not of proper type.\n";
	}
    },
    'previous' => sub { # only previous can handle percentage numbers right now.  the system is clumsy, too.
	my ($filter, $valueName, $prevTableTypes, $prevValueName) = splice(@_, 0, 4);
	if(!$filter->{'prevFilter'}) {
	    print STDERR "No previous filter -- mistake in creating request.\n";
	    return;
	}
	my $prevFilter = &findPrevFilterOfType($filter->{'prevFilter'}, split(',',$prevTableTypes));
	if($prevFilter) {
	    if($valueDefs->{$valueName}->{'type'} eq 'number') { # in these cases, we're dealing with a percentage.  Look for it in the next argument.
		my $percentage = $prevValueName/100;
#		print STDERR "valueName: $valueName\n";
		# 'dateDisclaimer' is quick & dirty hack to exclude pre-2003 values, as only deeds with dollar amounts could meaningfully appear in this context.
		my $dateDisclaimer = "$filter->{'id'}.date > '2003-01-01' AND";


		if($valueName eq 'bottom') {
#		    return &{$components->{'greaterthan'}} ($filter, $valueName, "$filter->{'id'}.$valueDefs->{$prevValueName}->{'columnName'} * $percentage");
		    return "$dateDisclaimer $filter->{'id'}.$valueDefs->{$valueName}->{'columnName'} >= $prevFilter->{'id'}.$valueDefs->{$valueName}->{'columnName'} * $percentage";
		} elsif($valueName eq 'top') {
#		    return &{$components->{'lessthan'}}    ($filter, $valueName, "$filter->{'id'}.$valueDefs->{$prevValueName}->{'columnName'} * $percentage");
		    return "$dateDisclaimer $filter->{'id'}.$valueDefs->{$valueName}->{'columnName'} <= $prevFilter->{'id'}.$valueDefs->{$valueName}->{'columnName'} * $percentage";
		}
	    } elsif($valueDefs->{$valueName}->{'type'} eq 'text') {
		return "$prevFilter->{'id'}.$valueDefs->{$prevValueName}->{'columnName'} = $filter->{'id'}.$valueDefs->{$valueName}->{'columnName'}";
	    } else {
		print STDERR "problem identifying the type of previous value.\n";
	    }
	} else {
	    print STDERR "Prev filter not of proper type.\n";
	}
    },
    'explicit' => sub {

    }
};


my $values = { 
# taxlot values takes as arguments [$filter, ARGS]
    'zoning' => sub { return '('.&{ $components->{'list'} }($_[0], 'zoning1', @_[1..$#_]).' OR '.&{ $components->{'list'} }($_[0], 'zoning2', @_[1..$#_]).')';},
    'numbldgs' => sub { return &{ $components->{'range'}}($_[0], 'numbldgs', @_[1..2]); },
    'bldgclass' => sub { return &{ $components->{'list'}}($_[0], 'bldgclass', @_[1..$#_]); },
#    'yearbuilt' => sub { return "$_[0].yearbuilt BETWEEN $_[1] AND $_[2]"; },
    'unitsres' => sub { return &{ $components->{'range'}} ($_[0], 'unitsres', @_[1..2]); },
#    'numfloors' => sub { return "$_[0].numfloors BETWEEN $_[1] AND $_[2]"; },
    'bct2000' => sub { return &{ $components->{'list'}} ($_[0], 'bct2000',  @_[1..$#_]); },
    'subborough' => sub { 
#	print STDERR "subborough: $_[1]\n";
	return &{$components->{'list'}} ($_[0], 'bct2000', @{ $subboroughs{$_[1]}});
    },
# filter values takes as arguments [$componentType, $filter, ARGS]
#    'amount' => sub { return &{$components->{$_[1]}} ($_[0], 'dollar', @_) },
#    'bottom' => sub { return &{ $components->{'greaterthan'}} ($_[0],'dollar',  $_[1]); },
#    'top' => sub { return &{ $components->{'lessthan'}} ($_[0],'dollar',  $_[1]); },
#    'from' => sub { return &{ $components->{'list'}} ($_[0], 'LIKE', 'party1concat',  @_[1..$#_]); },
#    'to' => sub { return &{ $components->{'list'}} ($_[0], 'LIKE', 'party2concat',  @_[1..$#_]); }
    'bottom' => sub { return &{ $components->{$_[1]}} ($_[0],'bottom',  @_[2..$#_]); },
    'top' => sub { return &{ $components->{$_[1]}} ($_[0],'top',  @_[2..$#_]); },
    'from' => sub { return &{ $components->{$_[1]}} ($_[0], 'from', @_[2..$#_]); },
    'to' => sub { return &{ $components->{$_[1]}} ($_[0], 'to', @_[2..$#_]); }
};
# filter values

my $mapSelectClauseRef = [];
#my $proMapSelectClause;
#my $conMapSelectClause;
my $mapGroupClause;
my $selectClause .= "SUM(1) AS sumSum, SUM(_1.number) AS sumNumber, SUM(_1.dollar) AS sumDollar";

#my @filterTables;
#my @mapFilterTables;
#my @graphFilterTables;
#my @filterWheres;


my $maxDateRange = 400; # 4 years
die("Must provide start and end date in an array.") if (@{$request->{'dates'}} != 2);
die("Difference between dates too great.") if ($request->{'dates'}->[1] - $request->{'dates'}->[0] > $maxDateRange);
die("Invalid start date format.") if (!$request->{'dates'}->[0] =~ /^\d{6}$/);
die("Invalid end date format.") if (!$request->{'dates'}->[1] =~ /^\d{6}$/);


# this graphgroupclause groups by the very first event -- not always desired.
#my $graphGroupClause = "EXTRACT(YEAR_MONTH FROM _1.date)";

#my $count = 1;

sub processValue {
#    my ($key, $tableId, $value, $filterWheres) = @_;
    my ($key, $filter, $value, $filterWheres) = @_;
#    my $tableId = $filter->{'id'};

#    print STDERR "processValue: $key = $value\n";
    if($values->{$key}) {
	my @valueValues = @{$value};
	push(@{$filterWheres}, &{$values->{$key}}($filter, @valueValues));
#	my @valueValues = @{$filter->{'values'}->{$key}}; # each value in a filter carries an array -- this is that array. 
#	push(@{$filterWheres},  &{$values->{$key}}($tableId, @valueValues, $filter));
   } else {
	die("$key is not a valid generic value for a filter.")
   }   
}

# Process table filters, which can contain values too.  We modify three array refs, one for map tables, one for graph tables, and one for all filter-specific where clauses.
# These array refs are modified with the global value limits later.
sub processFilter {
    my ($filter, $mapFilterTables, $graphFilterTables, $filterWheres, $mapFilterWheres, $count, $prevFilter) = @_;
    if($prevFilter) {
	$filter->{'prevFilter'} = $prevFilter;  # use the prev filter to create relational value limits.  There can be only one previous filter (though many thenFilters).
#	print STDERR "assigned filter of type $filter->{'type'} with prevFilter of type $prevFilter->{'type'}\n";
    }

    my $isInitialWithLotValues = ''; # this variable switches us to the _initial table when necessary (it is slower to use this table otherwise)

#    print STDERR "count: $count\n";
    $filter->{'id'} = "_$count";    
    if($count == 1) {
	#check for lotValues with initial filter only.
	if($filter->{'lotValues'}) {
	    $isInitialWithLotValues = '_initial';
	    # this is simply switching the first two tables -- it should therefore cause no drama with future joins.
	    foreach my $key (keys %{$filter->{'lotValues'}}) {
#		print STDERR "\nprocessValue key$key\n";
		&processValue($key, $filter, $filter->{'lotValues'}->{$key}, $filterWheres);
	    }
	}
    }

    push(@{$mapFilterTables}, $types->{$filter->{'type'}}->{'table'}.$isInitialWithLotValues.' '.$filter->{'id'}); # add the table onto the table list
    push(@{$graphFilterTables}, $types->{$filter->{'type'}}->{'table'}.$isInitialWithLotValues.' '.$filter->{'id'});
    
    if($types->{$filter->{'type'}}->{'limit'}) { # if there's a special limit, add it to the wheres list
	push(@{$filterWheres}, $filter->{'id'}.".".$types->{$filter->{'type'}}->{'limit'});
    }
    if($filter->{'values'}) { 
	foreach my $key (keys %{$filter->{'values'}}) {
#	    &processValue($key, $filter->{'id'}, $filter->{'values'}->{$key}, $filterWheres);
	    &processValue($key, $filter, $filter->{'values'}->{$key}, $filterWheres);
	}
    }

    if($filter->{'then'}) { # recursively deal with child filters, add the 'on' info for their joins and their relative date limits.
	foreach my $thenFilter (@{$filter->{'then'}}) {
	    $count++; # unique identifier for aliasing through the tree
	    $count = &processFilter($thenFilter, $mapFilterTables, $graphFilterTables, $filterWheres, $mapFilterWheres, $count, $filter);

	    my $a = $filter->{'id'};
	    my $b = $thenFilter->{'id'};
	    
	    $mapFilterTables->[$count-1] .= " on ($a.bct2000, $a.lotx, $a.aptnumber)=($b.bct2000, $b.lotx, $b.aptnumber)";
	    $graphFilterTables->[$count-1] .= " on ($a.bct2000, $a.lotx, $a.aptnumber)=($b.bct2000, $b.lotx, $b.aptnumber)";
	    push(@{$filterWheres}, "DATEDIFF($b.date, $a.date) BETWEEN ".$thenFilter->{'after'}->[0]." AND ".$thenFilter->{'after'}->[1]);

	    # only push this on for the map.
		# extra date limit reestablishes a limit for the first table that will be joined.
#    $dateClauseRef->[$i] = "EXTRACT(YEAR_MONTH from _$countRef->[$i].date) BETWEEN ".$request->{'dates'}->[0]." AND ".$request->{'dates'}->[1];
	    push(@{$mapFilterWheres}, "$a.date BETWEEN DATE_SUB(".$request->{'dates'}->[0]."01, INTERVAL ".$thenFilter->{'after'}->[1]." DAY) AND DATE_ADD(".$request->{'dates'}->[1]."01, INTERVAL 1 MONTH)");

	}
    }
    return $count;
}
# Deal with the filter requests.
my $countRef = [];
my ($mapFilterTablesRef, $graphFilterTablesRef, $filterWheresRef, $mapFilterWheresRef) = ([], [], [], []); # each is an array of an array, to be able to push tables and wheres separately onto each filter.

foreach my $i (0..$#{$request->{'filter'}}) {
    $countRef->[$i] = 1;
    ($mapFilterTablesRef->[$i], $graphFilterTablesRef->[$i], $filterWheresRef->[$i], $mapFilterWheresRef->[$i]) = ([],[],[], []); #ensure multi-dimensional arrays.
    $countRef->[$i] = &processFilter($request->{'filter'}->[$i], $mapFilterTablesRef->[$i], $graphFilterTablesRef->[$i], $filterWheresRef->[$i], $mapFilterWheresRef->[$i], $countRef->[$i]);
}

if($request->{'zoom'} eq 'city') { # for lot counts per ct2000
    foreach my $i (0..$#{$request->{'filter'}}) {
	$mapSelectClauseRef->[$i] = "$selectClause, _tracts.lotcount, _1.bct2000";
	push(@{$mapFilterTablesRef->[$i]}, 'censustracts_deriv_old _tracts ON (_1.bct2000) = (_tracts.bct2000)');
    }
  $mapGroupClause = '_1.bct2000';
} elsif($request->{'zoom'} eq 'tract') {
    die("Must have a view value for tract view") if(!$request->{'view'});
#    foreach $viewValue (@{$request->{'view'}}) { die("$viewValue is invalid boundary.") if(!$viewValue =~ /^-?\d*\.?\d*$/); } # must be digits, an optional dot, digits
    my $leftBound = $request->{'view'}->[0];
    my $topBound = $request->{'view'}->[1];
    my $rightBound = $request->{'view'}->[2];
    my $bottomBound = $request->{'view'}->[3];

    my $wktPoly = "POLYGON(($leftBound $topBound,$leftBound $bottomBound,$rightBound $bottomBound,$rightBound $topBound,$leftBound $topBound))";

    $mapGroupClause = '_1.bct2000, _1.lotx, _1.aptnumber';
    
    my $forceIndexShape = 'force index (shape)'; # mysql shies away from spatial index, but it makes everything go far, far, far faster.

    foreach my $i (0..$#{$request->{'filter'}}) {
	$mapSelectClauseRef->[$i] = "$selectClause, _1.bct2000, _1.lotx, _1.aptnumber, count(*) as lotcount, ASTEXT(CENTROID(_shapes.shape)) as coord, address, _1.party1concat, _$countRef->[$i].party2concat, _1.date";
	push(@{$filterWheresRef->[$i]}, "MBRWITHIN(_shapes.shape,GEOMFROMTEXT('$wktPoly'))");
	push(@{$mapFilterTablesRef->[$i]}, "taxlots_shapeaddress_deriv _shapes $forceIndexShape ON (_1.bct2000, _1.lotx) = (_shapes.bct2000, _shapes.lotx)");
	push(@{$mapFilterTablesRef->[$i]}, 'censustracts_deriv_old _tracts ON (_1.bct2000) = (_tracts.bct2000)');
	push(@{$graphFilterTablesRef->[$i]}, "taxlots_shapeaddress_deriv _shapes $forceIndexShape ON (_1.bct2000, _1.lotx) = (_shapes.bct2000, _shapes.lotx)");
	push(@{$graphFilterTablesRef->[$i]}, 'censustracts_deriv_old _tracts ON (_1.bct2000) = (_tracts.bct2000)');
    }
} else {
  die("Invalid zoom request.");
}

my ($filterWhereClauseRef, $mapFilterWhereClauseRef, $mapTableClauseRef, $graphTableClauseRef, $graphGroupClauseRef, $graphSelectClauseRef, $dateClauseRef) = ([],[],[],[],[],[],[]); # for construction of SQL queries for an arbitrary number of filters.

foreach my $i (0..$#{$request->{'filter'}}) {
    $filterWhereClauseRef->[$i] = join(' AND ', @{$filterWheresRef->[$i]});
    $mapFilterWhereClauseRef->[$i] = join(' AND ', @{$filterWheresRef->[$i]}, @{$mapFilterWheresRef->[$i]});
    $mapTableClauseRef->[$i] = join(' JOIN ', @{$mapFilterTablesRef->[$i]});
    $graphTableClauseRef->[$i] = join(' JOIN ', @{$graphFilterTablesRef->[$i]});

#my $graphGroupClause = "EXTRACT(YEAR_MONTH FROM _1.date)";
#my $graphSelectClause = "$selectClause, EXTRACT(YEAR_MONTH FROM _1.date) as yearmonth";

    #this forces the graph to be grouped by the last event that happened.
    $graphGroupClauseRef->[$i] = "EXTRACT(YEAR_MONTH FROM _$countRef->[$i].date)";
    $graphSelectClauseRef->[$i]= "$selectClause, EXTRACT(YEAR_MONTH FROM _$countRef->[$i].date) as yearmonth";
#my $dateClause = "EXTRACT(YEAR_MONTH FROM _1.date) BETWEEN ".$request->{'dates'}->[0]." AND ".$request->{'dates'}->[1];
    $dateClauseRef->[$i] = "EXTRACT(YEAR_MONTH from _$countRef->[$i].date) BETWEEN ".$request->{'dates'}->[0]." AND ".$request->{'dates'}->[1];
}

# Determining selected features:
my $tractsClause;

#my ($mapWhereRef, $graphWhereRef) = ([[]], [[]]);
my ($mapWhereRef, $graphWhereRef) = ([], []);

foreach my $i (0..$#{$request->{'filter'}}) {
    ($mapWhereRef->[$i], $graphWhereRef->[$i]) = ([],[]); # ensure multi-dimensional arrays.
    if($filterWhereClauseRef->[$i]) { # push the filterWhereClauses onto the maps & graphs
	push(@{$mapWhereRef->[$i]}, $mapFilterWhereClauseRef->[$i]);
	push(@{$graphWhereRef->[$i]}, $filterWhereClauseRef->[$i]);
    }
    push(@{$mapWhereRef->[$i]}, $dateClauseRef->[$i]); # only for maps, always exists.
}    

my ($mapWhereClauseRef, $graphWhereClauseRef) = ([], []);
foreach my $i (0..$#{$request->{'filter'}}) {
    $mapWhereClauseRef->[$i] = join(' AND ', @{$mapWhereRef->[$i]});
    $graphWhereClauseRef->[$i] = join(' AND ', @{$graphWhereRef->[$i]});
    $graphWhereClauseRef->[$i] = '1' if ($#{$graphWhereRef->[$i]} == -1); # Dummy true variable, because the graph sometimes is limitless (all the city for all times.)
}
my ($mapRequestRef, $graphRequestRef, $pieChartRequestRef) = ([], [], []);

my ($pieChartSecondPartySelectClauseRef, $pieChartMatchedPartySelectClauseRef, $pieChartSecondPartyGroupClauseRef, $pieChartOrderClauseRef) = ([], [], [], []);
my $pieChartSummarySelectClause = "NULL as party1concat, NULL as party2concat, $selectClause"; # total size of the chart.

# this code makes it so that 'initial' is actually looking at the second party.
my $pieChartFirstPartySelectClause = "_1.party2concat as party1concat, NULL, $selectClause"; # same for pro & con (_1 is always the first table) -- may want to start using party2concat though?
#my $pieChartFirstPartySelectClause = "_1.party1concat, NULL, $selectClause"; # same for pro & con (_1 is always the first table) -- may want to start using party2concat though?

#my $pieChartOrderClause = "sumSum DESC";
my $pieChartLimitClause = "6"; # top 6 parties makes seven total, with 'other'

# strip commas and other garbage, truncate for the sake of group by party
sub filterPartyForGroupBy { return "left(replace(replace(replace(replace($_[0], ',', ''), ' ', ''), '.', ''), '\"', ''), 12)"; }

# this code makes it so that 'initial' is actually looking at the second party.
my $pieChartFirstPartyGroupClause = &filterPartyForGroupBy("_1.party2concat");
#my $pieChartFirstPartyGroupClause = &filterPartyForGroupBy("_1.party1concat");

foreach my $i (0..$#{$request->{'filter'}}) {
    $mapRequestRef->[$i] = "
SELECT $mapSelectClauseRef->[$i]
FROM $mapTableClauseRef->[$i]
WHERE $mapWhereClauseRef->[$i]
GROUP BY $mapGroupClause
";
    $graphRequestRef->[$i] = "
SELECT $graphSelectClauseRef->[$i]
FROM $graphTableClauseRef->[$i] 
WHERE $graphWhereClauseRef->[$i] 
GROUP BY $graphGroupClauseRef->[$i]
";

    $pieChartSecondPartySelectClauseRef->[$i] = "NULL, _$countRef->[$i].party2concat, $selectClause";

#    print STDERR encode_json($filterRef->[$i])."\n\n";
    $pieChartOrderClauseRef->[$i] = "$filterRef->[$i]->{'dataType'} DESC";

# this code makes it so that 'initial' is actually looking at the second party.
    $pieChartMatchedPartySelectClauseRef->[$i] = "_1.party2concat as party1concat, _$countRef->[$i].party2concat, $selectClause";
#    $pieChartMatchedPartySelectClauseRef->[$i] = "_1.party1concat, _$countRef->[$i].party2concat, $selectClause";

    $pieChartSecondPartyGroupClauseRef->[$i] = &filterPartyForGroupBy("_$countRef->[$i].party2concat");
    $pieChartRequestRef->[$i] = "
(
SELECT $pieChartSummarySelectClause
FROM $mapTableClauseRef->[$i]
WHERE $mapWhereClauseRef->[$i]
)
UNION
(
SELECT $pieChartFirstPartySelectClause
FROM $mapTableClauseRef->[$i]
WHERE $mapWhereClauseRef->[$i]
GROUP BY $pieChartFirstPartyGroupClause
ORDER BY $pieChartOrderClauseRef->[$i]
LIMIT $pieChartLimitClause
)
UNION
(
SELECT $pieChartSecondPartySelectClauseRef->[$i]
FROM $mapTableClauseRef->[$i]
WHERE $mapWhereClauseRef->[$i]
GROUP BY $pieChartSecondPartyGroupClauseRef->[$i]
ORDER BY $pieChartOrderClauseRef->[$i]
LIMIT $pieChartLimitClause
)
UNION
(
SELECT $pieChartMatchedPartySelectClauseRef->[$i]
FROM $mapTableClauseRef->[$i]
WHERE $mapWhereClauseRef->[$i]
GROUP BY $pieChartFirstPartyGroupClause, $pieChartSecondPartyGroupClauseRef->[$i]
ORDER BY $pieChartOrderClauseRef->[$i]
LIMIT $pieChartLimitClause
)
";
print STDERR "graphRequest $i: $graphRequestRef->[$i]\n";
print STDERR "mapRequest $i: $mapRequestRef->[$i]\n";
print STDERR "pieChartRequest $i: $pieChartRequestRef->[$i]\n\n\n";

}


sub processGraphData {
    my $graphResponseRef = $_[0];

    my $values = [];
    foreach my $row (@{$graphResponseRef}) {
	my $year = substr($row->{'yearmonth'}, 0, 4);
	my $month = substr($row->{'yearmonth'}, 4, 2);
	my $timeKey = $year + (($month -1) /12); # numeric key for the graph.
	my $value = "<value><yearFraction>$timeKey</yearFraction><sumSum>$row->{'sumSum'}</sumSum><sumNumber>$row->{'sumNumber'}</sumNumber><sumDollar>$row->{'sumDollar'}</sumDollar></value>";

	push (@{$values}, $value);
    }
    return $values;
}

sub generateGraph {
    my ($graphRequest, $graphRequestId, $graphRequestJSON, $filter, $dbh) = @_;

    if(!$dbh) {
	$dbh = DBI->connect("DBI:mysql:$database:localhost", $user, $password); # use the dbh handle if already made.
    }

    my $graphTempOutput = "$graphs/tmp/$request->{'zoom'}/geogrape-temp-$graphRequestId.xml";
    open GRAPH, ">$graphTempOutput" or print STDERR "Could not open Graph output @ $graphTempOutput.\n";

    my $selectcommand = $dbh->prepare($graphRequest);
    $selectcommand->execute();
    my $graphResponseRef = $selectcommand->fetchall_arrayref({}); # order is important, but keep hash values.
    my $values = &processGraphData($graphResponseRef);
    
    my @graphDataComponent;

    print GRAPH "
<xml><graph>
<name>".$filter->{'name'}."</name>
<filterId>".$graphRequestId."</filterId>
<filterJSON>".$graphRequestJSON."</filterJSON>
<data>
".join("
", @{$values})."
</data>
</graph></xml>
";
    close GRAPH;
    `mv $graphs/tmp/$request->{'zoom'}/geogrape-temp-$graphRequestId.xml $graphs/tmp/$request->{'zoom'}/geogrape-$graphRequestId.xml`;
    
    return $dbh; # return this for use in the map, if needed.
}

sub extractLonLatFromCoord {

    my $lon = $_[0];
    my $lat = $_[0];

    $lon =~ s/^POINT\((-?\d+\.\d+) .*$/$1/;
    $lat =~ s/^.* (\d+\.\d+)\)$/$1/;
    my $originShift = pi * 6378137.0;

    $lon = ($lon / $originShift) * 180.0;
    $lat = ($lat / $originShift) * 180.0;

    $lat = 180 / pi * (2 * atan(exp($lat * pi /180.0)) - pi / 2.0);
    return ($lon, $lat);
}
sub generateLotXML {
    my $row = $_[0];
    my ($lon, $lat) = &extractLonLatFromCoord($row->{'coord'});
    return "
<lot bct2000lotxaptnumber=\"$row->{'bct2000'}-$row->{'lotx'}-$row->{'aptnumber'}\">
  <bct2000>$row->{'bct2000'}</bct2000>
  <lotx>$row->{'lotx'}</lotx>
  <aptNumber>$row->{'aptnumber'}</aptNumber>
  <address>$row->{'address'}</address>
  <sumSum>$row->{'sumSum'}</sumSum>
  <sumNumber>$row->{'sumNumber'}</sumNumber>
  <sumDollar>$row->{'sumDollar'}</sumDollar>
  <date>$row->{'date'}</date>
  <party1concat>$row->{'party1concat'}</party1concat>
  <party2concat>$row->{'party2concat'}</party2concat>
  <Point>
    <coordinates>$lon,$lat</coordinates>
  </Point>
</lot>
";
}

sub processCityMapData { # this is where we determine those painful, painful standard deviations.
    my $mapResponseRef = $_[0];
    my $mapListSize = scalar(keys %{$mapResponseRef});

    return if(!$mapListSize);
    $mapListSize++ if($mapListSize == 1); # prevent division by 0 for single-instance censustract maps
    my $minLotCount = $_[1]; # the minimum lot count in a census tract to be considered in calculating std dev. eliminates outliers, very important.

# accrue our sums...
    my $sumSumRatioSum = 0;
    my $numberSumRatioSum = 0;
    my $dollarSumRatioSum = 0;
    my $key;
    while($key = each %{$mapResponseRef}) {
	my $row = $mapResponseRef->{$key};
	next if $row->{'lotcount'} < $minLotCount;
	$sumSumRatioSum += $row->{'sumSum'}/$row->{'lotcount'};
	$numberSumRatioSum += $row->{'sumNumber'}/$row->{'lotcount'};
	$dollarSumRatioSum += $row->{'sumDollar'}/$row->{'lotcount'};
    }

# in order to obtain means...
    my $sumSumRatioMean = $sumSumRatioSum/$mapListSize; 
    my $numberSumRatioMean = $numberSumRatioSum/$mapListSize;
    my $dollarSumRatioMean = $dollarSumRatioSum/$mapListSize;
# which we may use to obtain a sum of squared deviations...
    my $sumSumSquareDeviationSum = 0;
    my $numberSumSquareDeviationSum = 0;
    my $dollarSumSquareDeviationSum = 0;

    while($key = each %{$mapResponseRef}) {
	my $row = $mapResponseRef->{$key};
	next if $row->{'lotcount'} < $minLotCount;
	$sumSumSquareDeviationSum += (($row->{'sumSum'}/$row->{'lotcount'}) - $sumSumRatioMean) * (($row->{'sumSum'}/$row->{'lotcount'}) - $sumSumRatioMean);
	$numberSumSquareDeviationSum += (($row->{'sumNumber'}/$row->{'lotcount'}) - $numberSumRatioMean) * (($row->{'sumNumber'}/$row->{'lotcount'}) - $numberSumRatioMean);
	$dollarSumSquareDeviationSum += (($row->{'sumDollar'}/$row->{'lotcount'}) - $dollarSumRatioMean) * (($row->{'sumDollar'}/$row->{'lotcount'}) - $dollarSumRatioMean);
    }

    my $meanSumSumSquareDeviation = $sumSumSquareDeviationSum / ($mapListSize -1);
    my $meanNumberSumSquareDeviation = $numberSumSquareDeviationSum / ($mapListSize -1);
    my $meanDollarSumSquareDeviation = $dollarSumSquareDeviationSum / ($mapListSize -1);

    my $sumSumStdDeviation = sqrt($meanSumSumSquareDeviation);
    my $numberSumStdDeviation = sqrt($meanNumberSumSquareDeviation);
    my $dollarSumStdDeviation = sqrt($meanDollarSumSquareDeviation);

    return(
	   { # return two hashrefs, $ratioMeansRef and $stdDeviationsRef
	       'sumSum' => $sumSumRatioMean,
	       'sumNumber' => $numberSumRatioMean,
	       'sumDollar' => $dollarSumRatioMean
	   },
	   {
	       'sumSum' => $sumSumStdDeviation,
	       'sumNumber'=> $numberSumStdDeviation,
	       'sumDollar'=> $dollarSumStdDeviation
	   }
	   );
#    return ($sumSumRatioMean, $numberSumRatioMean, $dollarSumRatioMean, $sumSumStdDeviation, $numberSumStdDeviation, $dollarSumStdDeviation);
}
sub calcRowPercentages {
    my ($row, $ratioMeansRef, $stdDeviationsRef) = @_;
    my $percentagesRef = {};
    
    foreach my $dataType (keys %{$ratioMeansRef}) {
	$percentagesRef->{$dataType} = 
	    (
	     ($row->{$dataType} / $row->{'lotcount'}) - ($ratioMeansRef->{$dataType})
	     ) / ($stdDeviationsRef->{$dataType});
	$percentagesRef->{$dataType} += .5;
	if($percentagesRef->{$dataType} > 1) {
	    $percentagesRef->{$dataType} = 1;
	} elsif($percentagesRef->{$dataType} < 0) {
	    $percentagesRef->{$dataType} = 0;
	}
    }
    return $percentagesRef;
}

sub generateCensusTractXML { # generate the XML for a single census tract.
    my ($row, $ratioMeansRef, $stdDeviationsRef, $percentagesRef) = @_;

 # should mark the limitations on lotCount @ top of file.
    return "
<censustract bct2000=\"".$row->{'bct2000'}."\">
<lotCount>".$row->{'lotcount'}."</lotCount>
  <sumSum>
    <number>".$row->{'sumSum'}."</number>
    <stdDev>".((($row->{'sumSum'}/$row->{'lotcount'})-$ratioMeansRef->{'sumSum'})/$stdDeviationsRef->{'sumSum'})."</stdDev>
    <percentage>".$percentagesRef->{'sumSum'}."</percentage>
  </sumSum>
  <sumNumber>
    <number>".$row->{'sumNumber'}."</number>
    <stdDev>".((($row->{'sumNumber'}/$row->{'lotcount'})-$ratioMeansRef->{'sumNumber'})/$stdDeviationsRef->{'sumNumber'})."</stdDev>
    <percentage>".$percentagesRef->{'sumNumber'}."</percentage>
  </sumNumber>
  <sumDollar>
    <number>".$row->{'sumDollar'}."</number>
    <stdDev>".((($row->{'sumDollar'}/$row->{'lotcount'})-$ratioMeansRef->{'sumDollar'})/$stdDeviationsRef->{'sumDollar'})."</stdDev>
    <percentage>".$percentagesRef->{'sumDollar'}."</percentage>
  </sumDollar>
</censustract>
";
}

sub generateMap {
    my ($mapRequest, $mapRequestId, $mapRequestJSON, $filter, $dbh) = @_;

    if(!$dbh) {
	$dbh = DBI->connect("DBI:mysql:$database:localhost", $user, $password); # use the dbh handle if already made.
    }

    my $selectCommand = $dbh->prepare($mapRequest);
    $selectCommand->execute();

    open MAP, ">$overlays/tmp/$request->{'zoom'}/geogrape-temp-$mapRequestId.xml" or print STDERR "Could not open XML file for map output.\n"; # the XML file, which will be saved and used for the generation of maps by createMap.pl
#    open HEADER, '<header.txt';
#    while(<HEADER>) { print TEMPFILE $_; };
	
	# need to write up xml schema and link to it!
    print MAP "<xml>
<map>
<name>".$filter->{'name'}."</name>".
#<color>".$mapColor."</color>
#<icon>".$mapIcon."</icon>
"<filterId>".$mapRequestId."</filterId>
<filterJSON>".$mapRequestJSON."</filterJSON>
<dates>
<start>".$request->{'dates'}->[0]."</start>
<end>".$request->{'dates'}->[1]."</end>
</dates>
<zoom>".$request->{'zoom'}."</zoom>
<data>
";

    if($request->{'zoom'} eq 'city') { # we generate one sort of map if the zoom is general.

# determine standard deviations for the map. The order of columns is always the same for the first four -- sumSum, sumNumber, sumDollar, lotcount
#    my $mapResponseRef = $selectcommand->fetchall_arrayref;
	my $mapResponseRef = $selectCommand->fetchall_hashref('bct2000');
	
	my $minLotCount = 20; # min number of lots for a bct2000 to be considered -- may want to revise this so they are simplly excluded from processCityMapData's std deviation calculations.
	my ($ratioMeansRef, $stdDeviationsRef) = &processCityMapData($mapResponseRef, $minLotCount);
	foreach my $censustract (keys %{$mapResponseRef}) {

	    my $row = $mapResponseRef->{$censustract};

	    foreach my $dataType (keys %{$stdDeviationsRef}) { # ratioMeansRef & stdDeviationsRef will have the same types.  eliminate any divisions by 0
		$stdDeviationsRef->{$dataType} = 1 if ($stdDeviationsRef->{$dataType} == 0);
	    }

	    my $percentagesRef = &calcRowPercentages($row, $ratioMeansRef, $stdDeviationsRef);
	    print MAP &generateCensusTractXML($row, $ratioMeansRef, $stdDeviationsRef, $percentagesRef);
	}
    
    } elsif($request->{'zoom'} eq 'tract') { # tract file MAPs need to be deleted immediately after use -- ie by requestGraph itself.

	my $mapResponseRef = $selectCommand->fetchall_arrayref({});
	
	foreach my $row (@{$mapResponseRef}) {
	    print MAP &generateLotXML($row);
	}

    }
    print MAP "</data></map></xml>";
    close MAP;
    `mv $overlays/tmp/$request->{'zoom'}/geogrape-temp-$mapRequestId.xml $overlays/tmp/$request->{'zoom'}/geogrape-$mapRequestId.xml`; # move it to 'finished' location.
}

sub pieChartResponseToXML {
    my ($pieChartResponseRef, $pieChartRequestId, $pieChartRequestJSON, $pieChartName) = $_[0];
    
    my $pieCharts = { 'initial' => [],	'final' => [],	'correlation' => [] };
    my $pieChartSizes = {};
#    my $pieChartSizes = { 'initial' => {}, 'final' => {}, 'correlation' => {} };
    foreach my $pieChartType (keys %{$pieCharts}) {
	$pieChartSizes->{$pieChartType} = {};
	foreach my $dataType (@dataTypes) {
	    $pieChartSizes->{$pieChartType}->{$dataType} = 0;  # allow addition to determine full pie chart size.
	}
    }
    my $totalSize = {};
    foreach my $row (@{$pieChartResponseRef}) {
	my $dataXML = '';
	foreach my $dataType (@dataTypes) { $dataXML .= "<$dataType>$row->{$dataType}</$dataType>"; }
	if($row->{'party1concat'} && $row->{'party2concat'}) { # a row for the correlation chart
	    push(@{ $pieCharts->{'correlation'} }, "<slice>$dataXML<party1concat>$row->{'party1concat'}</party1concat><party2concat>$row->{'party2concat'}</party2concat></slice>");
	    foreach my $dataType (@dataTypes) { $pieChartSizes->{'correlation'}->{$dataType} += $row->{$dataType}; }
	} elsif($row->{'party1concat'}) { # a row for the initial chart
	    push(@{ $pieCharts->{'initial'} }, "<slice>$dataXML<party1concat>$row->{'party1concat'}</party1concat></slice>");
	    foreach my $dataType (@dataTypes) { $pieChartSizes->{'initial'}->{$dataType} += $row->{$dataType}; }
	} elsif($row->{'party2concat'}) { # a row for the final chart
	    push(@{ $pieCharts->{'final'} }, "<slice>$dataXML<party2concat>$row->{'party2concat'}</party2concat></slice>");
	    foreach my $dataType (@dataTypes) { $pieChartSizes->{'final'}->{$dataType} += $row->{$dataType}; }
	} elsif(!($row->{'party1concat'} && $row->{'party2concat'})) { # is a summary row
	    foreach my $dataType (@dataTypes) { $totalSize->{$dataType} = $row->{$dataType}; }

#	    $totalSize = $row->{$dataType};
#	    foreach my $dataType (@dataTypes) {
#		$dataForTotalsXML .= "<$dataType>$row->"
	} else {
#	    print STDERR "Column with strange party1concat and party2concat values while generating pie chart.\n";
	}
    }
    my @pieChartXML;
    foreach my $chart (keys (%{$pieCharts})) {
#	print STDERR "$totalSize, $pieChartSizes{$chart}, $chart";
	my $dataForTotalsXML = '';
	foreach my $dataType (@dataTypes) {
	    $dataForTotalsXML .= "<$dataType>".($totalSize->{$dataType} - $pieChartSizes->{$chart}->{$dataType})."</$dataType>";
	}
	push( @{ $pieCharts->{$chart} }, "<slice>$dataForTotalsXML<others>1</others></slice>");
	push(@pieChartXML, '<pieChart type="'.$chart.'"><type>'.$chart.'</type>'.join('', @{ $pieCharts->{$chart} }).'</pieChart>');
    }
    return join('', @pieChartXML);
}
sub generatePieChart {
    my ($pieChartRequest, $pieChartRequestId, $pieChartRequestJSON, $filter, $dbh) = @_;

    if(!$dbh) {
	$dbh = DBI->connect("DBI:mysql:$database:localhost", $user, $password); # use the dbh handle if already made.
    }

    my $selectCommand = $dbh->prepare($pieChartRequest);
    $selectCommand->execute();

    open PIECHART, ">$piecharts/tmp/geogrape-temp-$pieChartRequestId.xml" or print STDERR "Could not open pie chart for output.\n"; # open a temp file so that it is not grabbed before completion
    
    my $pieChartResponseRef = $selectCommand->fetchall_arrayref({});

    print PIECHART  "
<xml><pieCharts>
<name>".$filter->{'name'}."</name>
<filterId>".$pieChartRequestId."</filterId>
<filterJSON>".$pieChartRequestJSON."</filterJSON>
<dates>
<start>".$request->{'dates'}->[0]."</start>
<end>".$request->{'dates'}->[1]."</end>
</dates>
    <data>".&pieChartResponseToXML($pieChartResponseRef, $pieChartRequestId, $pieChartRequestJSON, $filter->{'name'})."
    </data>
  </pieCharts>
</xml>";

    close PIECHART;

    `mv $piecharts/tmp/geogrape-temp-$pieChartRequestId.xml $piecharts/tmp/geogrape-$pieChartRequestId.xml`; # move it to 'finished' location.
}

my $dbh;

my @idStatus;
my @graphStatus;
my @mapStatus;
my @pieChartStatus;
my $status;

foreach my $i (0..$#{$filterRequestIdRef}) {
    push(@idStatus, '"'.$filterRequestIdRef->[$i].'"');
}
foreach my $i (0..$#{$graphRequestRef}) {
    if(-e "$graphs/tmp/$request->{'zoom'}/geogrape-$untimedRequestIdRef->[$i].xml") {
	$status = 'premade';
    } else {
#    $dbh = generateGraph($proGraphRequest, $conGraphRequest, $graphRequestId); # returns its database handle.
	&generateGraph($graphRequestRef->[$i],$untimedRequestIdRef->[$i],$filterJSONRef->[$i],$filterRef->[$i], $dbh);
	$status = 'generated';
    }
    push(@graphStatus,'{"id": "'.$untimedRequestIdRef->[$i].'", "status": "'.$status.'"}');
}
# don't bother generating maps for supplemental requests
if(!$request->{'supplemental'}) {
    foreach my $i (0..$#{$mapRequestRef}) { # create a separate graph for each request.  Will be recomposited by requestGraph.
	if(-e "$overlays/tmp/$request->{'zoom'}/geogrape-$timedRequestIdRef->[$i].xml") {
	    $status = 'premade'
	} else {
	    print STDERR "GENERATED MAP XML @ $timedRequestIdRef->[$i]\n";
	    &generateMap($mapRequestRef->[$i], $timedRequestIdRef->[$i], $filterJSONRef->[$i],$filterRef->[$i],$dbh);
	    $status = 'generated';
	}
	push(@mapStatus, '{"id": "'.$timedRequestIdRef->[$i].'", "status": "'.$status.'"}');
    }
} else {
    foreach my $i (0..$#{$pieChartRequestRef}) {
	if(-e "$piecharts/tmp/geogrape-$timedRequestIdRef->[$i].xml") {
	    $status = 'premade';
	} else {
#	generatePieCharts($proPieChartRequest, $conPieChartRequest, $mapRequestId, $dbh);
	    &generatePieChart($pieChartRequestRef->[$i], $timedRequestIdRef->[$i], $filterJSONRef->[$i],$filterRef->[$i],$dbh);
	    $status = 'generated';
	}
	push(@pieChartStatus, '{"id": "'.$timedRequestIdRef->[$i].'", "status": "'.$status.'"}');
    }
}
print '
{
  "ids": ['.join(',', @idStatus).'],
  "graph": ['.join(',', @graphStatus).'],
  "map": ['.join(',', @mapStatus).'],
  "pieChart": ['.join(',', @pieChartStatus).']
}
';

close STDERR;
