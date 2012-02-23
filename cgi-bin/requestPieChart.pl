#!/usr/bin/perl -w

use CGI qw/:standard/;
use Time::HiRes qw(sleep); # for fraction-of-a-second sleep
use Geogrape qw($piecharts &filterRequestId &timedRequestId @dataTypes);
use XML::Simple qw(:strict);
use JSON::XS;

use strict;

open STDERR, '>>errlog.txt';
print STDERR "RequestPieChart attempt: \n";

my $query = new CGI;

#my $graphRequest = decode_json($query->param('requestJSON'));
#$graphRequest = decode_json($sampleRequest2);

my $pieChartRequest = decode_json($query->param('requestJSON'));
#my $dataType = "sumsum";
#my $dataType = $pieChartRequest->{'dataType'};

my @pieChartLocations;
my @pieChartRequestIds;
my @pieChartDataType;

foreach my $i (0..$#{$pieChartRequest->{'filter'}}) {
    my $dataType = $pieChartRequest->{'filter'}->[$i]->{'dataType'};
    my $pieChartRequestId = &timedRequestId(&filterRequestId($pieChartRequest->{'filter'}->[$i], $pieChartRequest->{'supplemental'}), $pieChartRequest);
    push(@pieChartRequestIds, $pieChartRequestId);
    push(@pieChartLocations, "$piecharts/tmp/geogrape-$pieChartRequestId.xml");

    push(@pieChartDataType, $dataType);
}
#die();
my $allPieChartsLoaded = 0;
until($allPieChartsLoaded) {  # wait until all pieChart locations exist.
    $allPieChartsLoaded = 1;
    foreach my $pieChartLocation (@pieChartLocations) {
	if(! -e $pieChartLocation) {
	    $allPieChartsLoaded = 0;
	}
    }
    sleep(.2);
}
sleep(.1);

my $xs = XML::Simple->new(ForceArray => ['pieChart', 'slice'], KeyAttr => []);

my @pieGroups;
foreach my $i (0..$#pieChartLocations) {
    my $pieChartRef = $xs->XMLin($pieChartLocations[$i]);    
#    my @dataTypes = ('sumsum', 'sumnumber', 'sumdollar');
#    my @pieChartTypes = ('initial', 'final', 'correlation');
    my @pies; # these are formatted thus: {"label":"<label>","data":[["<yearfraction>","<value>"],....]}
    my $dataType = $pieChartDataType[$i];
#    print STDERR $dataType;
    foreach my $pieChart (@{$pieChartRef->{'pieCharts'}->{'data'}->{'pieChart'}}) {

	my @sliceValues;
	my $pieChartType = $pieChart->{'type'}->[0];
	foreach my $slice (@{$pieChart->{'slice'}}) {
	    my @label;
	    if($slice->{'others'}) {  # an 'others' slice, don't look at other tags
		push(@label, 'Others');
	    } else {
		foreach my $tag (keys %{$slice}) { # construct the label out of all other tags.
		    next if(grep(/$tag/, @dataTypes));
		    push(@label, $slice->{$tag}); # should only be one of each tag, so we don't need to worry 'bout arrays
		}
	    }
	    my $label = join(' to ', @label); # ORDER???!!
	    print STDERR $dataType."\n";
	    my $sliceValue = '{"data":[[0,'.$slice->{$dataType}.']],"label":"'.$label.'"}';
	    push(@sliceValues, $sliceValue);
	}
	push(@pies, '"'.$pieChartType.'": ['.join(',', @sliceValues).']');
    }
    push(@pieGroups, '{'.join(',', @pies).'}');
}

print header;
print '['.join(',', @pieGroups).']';



