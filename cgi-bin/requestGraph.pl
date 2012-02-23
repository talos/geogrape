#!/usr/bin/perl -w

use CGI qw/:standard/;
use Time::HiRes qw(sleep); # for fraction-of-a-second sleep
use Geogrape qw(@dataTypes $graphs &filterRequestId &untimedRequestId);
#use XML::Parser;
use XML::Simple qw(:strict);
use JSON::XS;

use strict;

open STDERR, '>>errlog.txt';
print STDERR "RequestGraph attempt: \n";

my $query = new CGI;

# This test waits to see whether the graph exists yet.  If not, keep waiting.
my $graphRequest = decode_json($query->param('requestJSON'));
#$graphRequest = decode_json($sampleRequest2);

my $zoom = $graphRequest->{'zoom'};
#my $output = $graphRequest->{'output'};

my @graphLocations;
my @graphDataTypes;
foreach my $i (0..$#{$graphRequest->{'filter'}}) {
    push(@graphDataTypes, $graphRequest->{'filter'}->[$i]->{'dataType'});
#    print STDERR "graph data type: ".$graphRequest->{'filter'}->[$i]->{'dataType'}."\n\n";
    push(@graphLocations, "$graphs/tmp/$zoom/geogrape-".&untimedRequestId(&filterRequestId($graphRequest->{'filter'}->[$i], $graphRequest->{'supplemental'}), $graphRequest).".xml");
}
my $allGraphsLoaded = 0;

until($allGraphsLoaded) {  # wait until all graph locations exist.
    $allGraphsLoaded = 1;
    foreach my $graphLocation (@graphLocations) {
	if(! -e $graphLocation) {
	    $allGraphsLoaded = 0;
	}
    }
    sleep(.2);
}
sleep(.1);

#now, load them all & turn them into compact JSON.
print header;

my $xs = XML::Simple->new(ForceArray => ['value'], KeyAttr => []);

my @lines; # these are formatted thus: {"label":"<label>","data":[["<yearfraction>","<value>"],....]}
foreach my $i (0..$#graphLocations) {
    my $graphRef = $xs->XMLin($graphLocations[$i]);    
#    foreach my $dataType (@dataTypes) {
	my @lineValues;
	foreach my $value (@{$graphRef->{'graph'}->{'data'}->{'value'}}) {
	    push(@lineValues, '["'.$value->{'yearFraction'}.'","'.$value->{$graphDataTypes[$i]}.'"]');
	}
	push(@lines, '{"label":"'.$graphDataTypes[$i].'-'.$i.'", "data":['.join(',',@lineValues).']}');
#    }
}
print '['.join(',', @lines).']';


