#!/usr/bin/perl

#use strict;

open STDERR, '>>errlog.txt';
print STDERR "loadRequestForId.pl_________________\n";

# This script takes as input a JSON array of ID values and returns a JSON object
# where those values are keyed to their original requests.
# If there are no input parameters, will return a JSON array with all saved Geograpes keyed by ID.

use JSON::XS;
use CGI qw/:standard/;
#use XML::Simple;
use XML::Dumper;

use Geogrape qw( $requestIdsFile %subboroughs $database $user $password $graphs $overlays $piecharts );

my $query = new CGI;
my $requestedIds;
if($query->param('idsJSON')) {
    $requestedIds = decode_json($query->param('idsJSON'));
}
print STDERR $requestedIds;

my $requestIdsRef = xml2pl($requestIdsFile);

print header;

print encode_json($requestIdsRef);


