#!/usr/bin/perl -w

#use strict;

# This script takes as input a JSON string requesting a certain data set.
# In order to avoid extra SQL requests, all sorts of data requests must be encompassed.
# These include:
#	'dataByHiliteFeatureNew' requests: A request for graph info for feature(s).
#		format:		0->year,		(the year being described)
#					1->numberamount,(how many of hilite action happened to this feature for the described year)
#					2->divamount	(how much of hilite action happened to this feature for the described year)
#			OR
#		format:		0->year, 				(the year being described)
#					1->featuresumnumber,	(how many of hilite action happened to this feature for the described year)
#					2->featuresumdollar,	(how much of hilite action happened to this feature for the described year)
#					3->partysumnumber,		(how many of hilite action done by this party for the described year)
#					4->partysumdollar		(how much of hilite action done by this party for the described year)
#	'dataByHiliteYearNew' requests:	A request for map info for year(s) AND feature(s).
#		[an animation request is thus a series of these]
#		format:		0->geometry, (feature location, if it's a point)
#					1->name, (name of described feature)
#					2->partyname, (name of party involved with feature)
#					3->featuresumnumber, (how many of hilite action happened to this feature)
#					4->featuresumdollar, (how much of hilite action happened to this feature)
#					5->partysumnumber, (how many of hilite action done by this party)
#					6->partysumdollar, (how much of hilite action done by this party)
#	'children' requests: A request for the children of a feature.
#		format:
#	

######	RETURN DATA FORMAT	######

#	<dataNode>: [
#					[#,$],
#					{
#						party1:[#,$],
#						party2:[#,$],
#						party3:[#,$]...
#					}
#				]
# new new return data format:
#  {
#   '103-2000': {
#     'lotcount':{'196601':1000,'198205':2000...},
#     'data': {
#        [{'1966': <dataNode>, '1967': <dataNode>,...},
#         {'1966': <dataNode>, '1967': <dataNode>,...},...]
#     },
#   '103-2002': {....}
#  }
#

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

use DBI;
use JSON::XS;
use CGI qw/:standard/;

use Geogrape;

print header;

my $query = new CGI;

#my $requestJSON = $query->param('request') or die('No request made.');


# temp line for testing.
#my $requestJSON = $ARGV[0];

my $requestJSON = '
{
    "zoom": "tract",
    "dates": ["198701","198712"],
    "values": {
	   "zoning": ["M", "R", "C"],
	   "numbldgs": [0, 1000]
	},
    "filter": {
	"type": "mortgage",
	"values": {
	    "to": ["citibank", "greenpoint", "greenpt"]
	},
      "then": [
	     {
	       "after": [1,1000],
		 "type": "foreclosure"
	     }
      ]
    }
}';
$requestJSON = '
{
    "zoom": "tract",
    "view": [-8000000,4000000,-9000000,5000000],
    "dates": [198701, 198712],
    "values": {
	"bct2000": [10014, 10016, 10018]
    },
    "filter": {
	"type": "mortgage"
    }
}';
# Everything 1-4 unit residential property in 1987 receiving a mortgage forecosed within 1000 days.
# 11.26 seconds for the map, 3m 4.29s for the graph...  But it's a beautiful graph! (check out the peak in '06)
# goes down to 35 secs (independent of caching) if '_lot' is first with a set of straight joins following.
# however, the straight join trick slows down generation of the map to 35 seconds!
# CAVEAT: straight_join only saves time if it's (_lots->_2, _1->_2).  the way things are set up, default is to run (_lots->_1, _1->_2). this is bad.
# (_lots->_2, _1->_lots) works too.
$requestJSON = '
{
    "zoom": "city",
    "dates": [198701, 198712],
    "values": {
"zoning": ["R"],
"unitsres": [1,4]
    },
    "filter": {
	"type": "mortgage",
	"then": [
		 {
		     "after": [1,1000],
		     "type": "foreclosure"
		 }
		 ]
	}
}';




my $types = {
  'mortgage'=> {
    'table'=>'records_mortgages_deriv'
  },
  'owner'=> {
    'table'=>'records_deeds_deriv'
  },
  'foreclosure'=>{
    'table'=>'records_deeds_deriv',
    'limit'=>'info = "foreclosure"'
  },
  'inrem'=> {
    'table'=>'records_deeds_deriv',
    'limit'=>'info = "inrem"'
  },
  'mortgagesatisfaction'=> {
    'table'=>'records_satisfactions_deriv'
  },
  'mortgageassignment'=> {
    'table'=>'records_assignments_deriv'
  }
};

sub generateOrList {
    my $totalEquality = shift();
    my $tableId = shift();
    my $columnName = shift();
    my @statements;
    foreach $value (@_) {
	push(@statements, "$tableId.$columnName LIKE '%$value%'") if(!$totalEquality);
	push(@statements, "$tableId.$columnName = '$value'") if ($totalEquality);
    }
    return '('.join(' OR ', @statements).')';
}
sub generateEqualOrList { return &generateOrList(1, @_);  }
sub generateSimilarOrList { return &generateOrList(0, @_); }

my $values = {
# taxlot values
  'zoning' => sub {
      return
	  '('.&generateSimilarOrList($_[0], 'allzoning1', @_[1..$#_]).' OR '.&generateSimilarOrList($_[0], 'allzoning2', @_[1..$#_]).')';
  },
  'numbldgs' => sub { return "$_[0].numbldgs BETWEEN $_[1] AND $_[2]"; },
  'bldgclass' => sub { return &generateSimilarOrList($_[0], 'bldgclass', @_[1..$#_]) },
  'yearbuilt' => sub { return "$_[0].yearbuilt BETWEEN $_[1] AND $_[2]"; },
  'unitsres' => sub { return "$_[0].unitsres BETWEEN $_[1] AND $_[2]"; },
  'numfloors' => sub { return "$_[0].numfloors BETWEEN $_[1] AND $_[2]"; },
  'bct2000' => sub {return &generateEqualOrList($_[0], 'bct2000', @_[1..$#_]) },

# filter values
  'from'=> sub { return &generateSimilarOrList($_[0], 'party1concat', @_[1..$#_]); },
  'to' => sub { return &generateSimilarOrList($_[0], 'party2concat', @_[1..$#_]); },
  'minimum' => sub { return "$_[0].number >= $_[1]" },
  'maximum' => sub { return "$_[0].number <= $_[1]" },
  'number' => sub { return "$_[0].number = $_[1]" }
};

my $request = decode_json($requestJSON) or die('Invalid JSON.');

#print $requestJSON;

my $mapSelectClause;
my $mapGroupClause;
my $selectClause .= "SUM(1) AS sumsum, SUM(_1.number) AS sumnumber, SUM(_1.dollar) AS sumdollar";

#my @filterTables;
my @mapFilterTables;
my @graphFilterTables;
my @filterWheres;


my $graphSelectClause = "$selectClause, EXTRACT(YEAR_MONTH FROM _1.date)";

die("Must provide start and end date in an array.") if (@{$request->{'dates'}} != 2);
die("Invalid start date format.") if (!$request->{'dates'}->[0] =~ /^\d{6}$/);
die("Invalid end date format.") if (!$request->{'dates'}->[1] =~ /^\d{6}$/);

my $dateClause = "EXTRACT(YEAR_MONTH FROM _1.date) BETWEEN ".$request->{'dates'}->[0]." AND ".$request->{'dates'}->[1];

my $graphGroupClause = "EXTRACT(YEAR_MONTH FROM _1.date)";

my $count = 1;

sub processValue {
    my ($key, $tableId, $value) = @_;
    if($values->{$key}) {
	my @valueValues = @{$value};
#	my @valueValues = @{$filter->{'values'}->{$key}}; # each value in a filter carries an array -- this is that array. 
	push(@filterWheres,  &{$values->{$key}}($tableId, @valueValues));
   } else {
	die("$key is not a valid generic value for a filter.")
   }   
}

# Process table filters, which can contain values too.
sub processFilter {
    my $filter = $_[0];
    $filter->{'id'} = "_$count";
    $count++; # unique identifier for aliasing through the tree

    push(@mapFilterTables, $types->{$filter->{'type'}}->{'table'}.' '.$filter->{'id'}); # add the table onto the table list
    push(@graphFilterTables, $types->{$filter->{'type'}}->{'table'}.' '.$filter->{'id'});
    if($types->{$filter->{'type'}}->{'limit'}) { # if there's a special limit, add it to the wheres list
	push(@filterWheres, $filter->{'id'}.".".$types->{$filter->{'type'}}->{'limit'});
    }
    if($filter->{'values'}) { 
	foreach $key (keys %{$filter->{'values'}}) {
	    &processValue($key, $filter->{'id'}, $filter->{'values'}->{$key});
	}
    }

    if($filter->{'then'}) { # recursively deal with child filters, add the 'on' info for their joins and their relative date limits.
	foreach $thenFilter (@{$filter->{'then'}}) {
	    &processFilter($thenFilter);

	    my $a = $filter->{'id'};
	    my $b = $thenFilter->{'id'};
	    
	    $mapFilterTables[$#mapFilterTables] .= " on ($a.bct2000, $a.lotx, $a.aptnumber)=($b.bct2000, $b.lotx, $b.aptnumber)";
	    $graphFilterTables[$#graphFilterTables] .= " on ($a.bct2000, $a.lotx, $a.aptnumber)=($b.bct2000, $b.lotx, $b.aptnumber)";
	    push(@filterWheres, "DATEDIFF($b.date, $a.date) BETWEEN ".$thenFilter->{'after'}->[0]." AND ".$thenFilter->{'after'}->[1]);
	}
    }
}
# Deal with the filter requests.
&processFilter($request->{'filter'});

# Deal with any request-level value requests -- these will result in a need to join the _taxlots table in.
# This gets tricky with filterTables, because for speed reasons it has to be added to the front (unshift) for graphs but not for maps.
if($request->{'values'}) { 
    push(@mapFilterTables, "taxlots_deriv _lots ON (_1.bct2000, _1.lotx, _1.aptnumber) = (_lots.bct2000, _lots.lotx, _lots.aptnumber)");
    unshift(@graphFilterTables, "taxlots_deriv _lots");
    $graphFilterTables[1] .= " ON (_lots.bct2000, _lots.lotx, _lots.aptnumber) = (_1.bct2000, _1.lotx, _1.aptnumber)";  # This would have been the _1 filter table, which now needs explicit join values.
    foreach $key (keys %{$request->{'values'}}) {
	&processValue($key, '_lots', $request->{'values'}->{$key});
    }
}

if($request->{'zoom'} eq 'city') {
  $mapSelectClause = "$selectClause, _1.bct2000";
  $mapGroupClause = '_1.bct2000';
} elsif($request->{'zoom'} eq 'tract') {
    die("Must have a view value for tract view") if(!$request->{'view'});
    foreach $viewValue (@{$request->{'view'}}) { die("$viewValue is invalid boundary.") if(!/^-?\d*\.?\d*$/); } # must be digits, an optional dot, digits
    my $leftBound = $request->{'view'}->[0];
    my $topBound = $request->{'view'}->[1];
    my $rightBound = $request->{'view'}->[2];
    my $bottomBound = $request->{'view'}->[3];

    my $wktPoly = "POLYGON(($leftBound $topBound,$leftBound $bottomBound,$rightBound $bottomBound,$rightBound $topBound,$leftBound $topBound))";

    $mapSelectClause = "$selectClause, _1.bct2000, _1.lotx, ASTEXT(CENTROID(_shapes.shape)), address";
    $mapGroupClause = '_1.bct2000, _1.lotx';
    
    push(@filterWheres, "MBRWITHIN(_tracts.shape,GEOMFROMTEXT('$wktPoly'))");
    push(@mapFilterTables, 'taxlots_shapeaddress_deriv _shapes ON (_1.bct2000, _1.lotx) = (_shapes.bct2000, _shapes.lotx)');
    push(@mapFilterTables, 'censustracts_deriv _tracts ON (_1.bct2000) = (_tracts.bct2000)');
    push(@graphFilterTables, 'taxlots_shapeaddress_deriv _shapes ON (_1.bct2000, _1.lotx) = (_shapes.bct2000, _shapes.lotx)');
    push(@graphFilterTables, 'censustracts_deriv _tracts ON (_1.bct2000) = (_tracts.bct2000)');

} else {
  die("Invalid zoom request.");
}

#@graphFilterTables = @graphFilterTables[0, reverse(@graphFilterTables[1..$#graphFilterTables])];
#@graphFilterTables = reverse(@graphFilterTables);
#unshift(@graphFilterTables, pop(@graphFilterTables));
#@graphFilterTables = @graphFilterTables[1..$#graphFilterTables];
my $filterWhereClause = join(' AND ', @filterWheres);
my $mapTableClause = join(' JOIN ', @mapFilterTables);
#my $graphTableClause = join(' STRAIGHT_JOIN ', @graphFilterTables); # is this time-saving consistent? works when there is a lot-check might not be effective otherwise.
my $graphTableClause = join(' JOIN ', @graphFilterTables);

# Determining selected features:
my $tractsClause;
my $idClause; # the reconstruction method for id of children from group by.

my @mapWhereClause;
my @graphWhereClause;
if($featureClause) {
  push(@mapWhereClause, $featureClause);
  push(@graphWhereClause, $featureClause);
}
if($filterWhereClause) {
  push(@mapWhereClause, $filterWhereClause);
  push(@graphWhereClause, $filterWhereClause);
}
push(@mapWhereClause, $dateClause); # only for maps, always exists.

my $mapWhereClause = join(' AND ', @mapWhereClause);
my $graphWhereClause = join(' AND ', @graphWhereClause);
$graphWhereClause = '1' if($#graphWhereClause == -1); # Dummy true variable, because the graph sometimes is limitless (all the city for all times.)

my $mapRequest = "
SELECT $mapSelectClause
FROM $mapTableClause
WHERE $mapWhereClause
GROUP BY $mapGroupClause
";

my $graphRequest = "
SELECT $graphSelectClause
FROM $graphTableClause 
WHERE $graphWhereClause 
GROUP BY $graphGroupClause
";

print "mapRequest: $mapRequest\n";
print "graphRequest: $graphRequest\n";

die ("\n\nearly execution kill");

#my $dbh = DBI->connect("DBI:mysql:$database:localhost", $user, $password);	

#my $selectcommand = $dbh->prepare($query);
#$selectcommand->execute();



#print encode_json();
