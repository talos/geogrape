#!/usr/bin/perl -w

use Archive::Zip qw( :ERROR_CODES );
use CGI qw/:standard/;
use Time::HiRes qw(sleep); # for fraction-of-a-second sleep
use Geogrape qw($overlays $local_geogrape_path $url_geogrape_path $icons $icon0 $icon1 $icon01 $baseUrl &filterRequestId &timedRequestId &mapRequestId);
use XML::Simple qw(:strict);
use JSON;

use strict;

open STDERR, '>>errlog.txt';
print STDERR "_________________\n";

my $query = new CGI;

# This test waits to see whether the map data exists yet.  If not, keep waiting.
my $mapRequest = &decode_json($query->param('requestJSON'));
#$mapRequest = decode_json($sampleRequest2);

my @mapLocations;
my @mapRequestIds;
my @outputMapRequestIds;
my @mapDataType;
my $zoom = $mapRequest->{'zoom'};
#my $dataType = $mapRequest->{'dataType'}; # sumSum, sumNumber, sumDollar

foreach my $i (0..$#{$mapRequest->{'filter'}}) {
#    print STDERR "Maprequest.pl::".&encode_json($mapRequest->{'filter'}->[$i])."\n";
    my $dataType = $mapRequest->{'filter'}->[$i]->{'dataType'};
#    my $mapRequestId = &mapRequestId(&timedRequestId(&filterRequestId($mapRequest->{'filter'}->[$i]), $mapRequest), $dataType);
    my $mapRequestId = &timedRequestId(&filterRequestId($mapRequest->{'filter'}->[$i], $mapRequest->{'supplemental'}), $mapRequest); # NOW INCLUDES DATATYPE. thus no separate outputmaprequestid
#    my $outputMapRequestId = &mapRequestId(&timedRequestId(&filterRequestId($mapRequest->{'filter'}->[$i], $mapRequest->{'supplemental'}), $mapRequest), $dataType); # with dataType, creates KML/KMZ files
    my $outputMapRequestId = $mapRequestId;

#    print STDERR $dataType."\n";
    push(@mapRequestIds, $mapRequestId);
    push(@mapLocations, "$overlays/tmp/$zoom/geogrape-$mapRequestId.xml");
    push(@mapDataType, $dataType);
    push(@outputMapRequestIds, $outputMapRequestId);
}

my $allMapsLoaded = 0;
until($allMapsLoaded) {  # wait until all map locations exist.
    $allMapsLoaded = 1;
    foreach my $mapLocation (@mapLocations) {
	if(! -e $mapLocation) {
	    $allMapsLoaded = 0;
	}
    }
    sleep(.2) if(!$allMapsLoaded);
}
sleep(.1);

# the KMZ file will be created from several IDs -- concatenate them with commas.

my $mapOutputId = join('-', @outputMapRequestIds);

my $mapTempLocation = "$overlays/tmp/$zoom/geogrape-temp-$mapOutputId.kml"; # where we assemble the KML file
my $mapOutputLocation = "$local_geogrape_path/$overlays/tmp/$zoom/geogrape-$mapOutputId.kmz"; # final output for the KMZ
my $mapOutputLocationUrl = "$url_geogrape_path/$overlays/tmp/$zoom/geogrape-$mapOutputId.kmz";
#my $mapOutputLocationUrl = "$url_geogrape_path/$overlays/tmp/$zoom/geogrape-$mapOutputId.kmz";

if(-e $mapOutputLocation) {
    print header;
    print $mapOutputLocationUrl;
    exit 0;
}

# now, load them all & create the KMZ file accessible on the server.  Return the URL to the KMZ file.

open TEMPFILE, ">$mapTempLocation" or print STDERR "Could not open temp KML file for map creation at $mapTempLocation.\n";
open HEADER, '<header.txt';
while(<HEADER>) { print TEMPFILE $_; }
close HEADER;

if($mapRequest->{'zoom'} eq 'city') { # order the censustracts by bct2000

    open CENSUSTRACTS, '<footer.txt';

    my $mapRefs = [];
    my $xs = XML::Simple->new(ForceArray => ['censustract'], KeyAttr => ['bct2000']);
    foreach my $i (0..$#mapLocations) { 
	my $mapRef = $xs->XMLin($mapLocations[$i]);
	my $ctValues = $mapRef->{'map'}->{'data'}->{'censustract'};
	push(@{$mapRefs}, $ctValues); # push a hashref by bct2000 onto the maps array.
#	print $valuesByBct2000->{'30410'}->{'sumSum'}->{'percentage'}."\n";
#	foreach $key (keys %{$mapRef->{'map'}->{'data'}->{'censustract'}}) {
#	    print "$key\n";
#	}
    }
    print STDERR "$mapLocations[0]: ".scalar(keys(%{$mapRefs->[0]}))."\n";
    print STDERR "$mapLocations[1]: ".scalar(keys(%{$mapRefs->[1]}))."\n";

    while(<CENSUSTRACTS>) {
	print TEMPFILE $_; # feed through the line no matter what.
	next unless(/\<name\>/);# just feed it back out unless this is a new placemark.

        my ($censustract) = ($_ =~ /(\d{5})/); # isolate census tract key from name.
	
	my ($m, $y, $c) = (0,0,0);
	
	foreach my $i (0..$#{$mapRefs}) {
#	    print STDERR $i."\n";
#	    $mapValues{$i} = $mapRefs[$i]->{$censustract}; # may very well not exist in this data set.
#	    print STDERR $mapRefs[$i]->{$censustract}->{'sumSum'}->{'percentage'}."\n";
#	    if($mapRefs->[$i]->{$censustract}->{'sumSum'}->{'percentage'}) {
	    if($mapRefs->[$i]->{$censustract}->{$mapDataType[$i]}->{'percentage'}) {
		my $percentage = $mapRefs->[$i]->{$censustract}->{$mapDataType[$i]}->{'percentage'};
#		print STDERR "$i:$percentage\n";
		if($i == 0) {
		    $m += $percentage/2;
		    $c += $percentage;
		} elsif($i == 1) {
		    $m += $percentage;
		    $y += $percentage;
		}
	    }
	}
	# need new coloring formula to account for differing number of mapRefs


#	my $green = 1 -$m;
#	my $blue = 1 - $y;
#	my $red = 1- $c;
	my $green = 1 - ($m - ($c*$y/2));
	my $blue = 1 - ($y - ($y*$c));
	my $red = 1- ($c - ($y*$c));

#	    my $alpha = 1- $green;
	my $alpha = ($y+$m+$c)/1;
	if($alpha > 1) { $alpha = 1; }

	my $hexAlpha = sprintf("%02X", int($alpha*255));
	my $hexColor = sprintf("%02X%02X%02X%02X", int($alpha*255), int($blue*255), int($green*255), int($red*255)); # red->con, blue->pro no transparency (AABBGGRR)
#	    print STDERR $hexColor;
#	    my $hexColor = 'FF'.sprintf("%02X%02X%02X", $proPercentages[0], 0, $conPercentages[0]); # red->con, blue->pro no transparency (AABBGGRR)
	
	# Print the color definition.
	print TEMPFILE "<Style><LineStyle><color>".$hexAlpha."000000</color><width>.5</width></LineStyle><PolyStyle><color>".$hexColor."</color></PolyStyle></Style>\n";

	# Print the placemark information.
#	    print TEMPFILE "<description><![CDATA[ ".&generateMarkerHTML($lotcount, $proRow, $conRow, $proSumSumRatioMean, $proNumberSumRatioMean, $proDollarSumRatioMean, $proSumSumStdDeviation, $proNumberSumStdDeviation, $proDollarSumStdDeviation, $conSumSumRatioMean, $conNumberSumRatioMean, $conDollarSumRatioMean, $conSumSumStdDeviation, $conNumberSumStdDeviation, $conDollarSumStdDeviation)."]]></description>";
    }
    print TEMPFILE "\n";
    close CENSUSTRACTS;

} elsif($mapRequest->{'zoom'} eq 'tract') {
    print TEMPFILE "
<Style id=\"style0\">
  <IconStyle>
    <Icon>
      <href>$baseUrl/$url_geogrape_path/$icons/$icon0</href>
    </Icon>
  </IconStyle>
</Style>
<Style id=\"style1\">
  <IconStyle>
    <Icon>
      <href>$baseUrl/$url_geogrape_path/$icons/$icon1</href>
    </Icon>
  </IconStyle>
</Style>
<Style id=\"style01\">
  <IconStyle>
    <Icon>
      <href>$baseUrl/$url_geogrape_path/$icons/$icon01</href>
    </Icon>
  </IconStyle>
</Style>
<Style id=\"style10\">
  <IconStyle>
    <Icon>
      <href>$baseUrl/$url_geogrape_path/$icons/$icon01</href>
    </Icon>
  </IconStyle>
</Style>
";
    
    my $xs = XML::Simple->new(ForceArray => ['lot'], KeyAttr => ['bct2000lotxaptnumber']);
    my $allLotsByBct2000lotxaptnumber = {}; # all lots indexed by bct2000lotxaptnumber, each containing an array with the index of the filter which led to its inclusion.
    foreach my $i (0..$#mapLocations) {
	my $mapRef = $xs->XMLin($mapLocations[$i]);
#	push(@lotsRefs, $mapRef->{'map'}->{'data'}->{'lot'});
	if(ref($mapRef->{'map'}->{'data'}->{'lot'}) eq 'HASH') {
	    my %mapLotsByBct2000lotxaptnumber = %{$mapRef->{'map'}->{'data'}->{'lot'}};
	    foreach my $bct2000lotxaptnumber (keys %mapLotsByBct2000lotxaptnumber) {
		if(!$allLotsByBct2000lotxaptnumber->{$bct2000lotxaptnumber}) {
		    $allLotsByBct2000lotxaptnumber->{$bct2000lotxaptnumber} = {};
		}
		$allLotsByBct2000lotxaptnumber->{$bct2000lotxaptnumber}->{"$i"} = $mapLotsByBct2000lotxaptnumber{$bct2000lotxaptnumber};
	    }
	} else {
	    print STDERR "No map data for $mapLocations[$i]\n";
	}
    }
    foreach my $bct2000lotxaptnumber (keys %{$allLotsByBct2000lotxaptnumber}) {
	my $lotRef = $allLotsByBct2000lotxaptnumber->{$bct2000lotxaptnumber}; # lotRef is an arrayref with all the different component filters inside -- in other words, {1}, {2}, etc.
	my @styleId;
	my @description;
	my $address;
	my $coordinates;
	foreach my $i (keys %{$lotRef}) {
	    my $lot = $lotRef->{"$i"};
	    $address = $lot->{'address'};
	    $coordinates = $lot->{'Point'}->{'coordinates'};
	    push(@styleId, $i);
	    push(@description,"$i: \$$lot->{'sumDollar'} across $lot->{'sumNumber'} transactions, from $lot->{'party1concat'} to $lot->{'party2concat'} on $lot->{'date'}");
	}
	my $description = join(',', @description);
	my $styleId = join('', @styleId);
	print TEMPFILE "
<Placemark>
<name>$address</name>
<styleUrl>#style$styleId</styleUrl>
<description>$description</description>
<Point>
<coordinates>$coordinates</coordinates>
</Point>
</Placemark>
";	
    }
    # DON'T print this line for city requests -- it's included in the <CENSUSTRACTS> file which is fed in.
    print TEMPFILE "
</Document></kml>
";
}

## (( compress the KML file to KMZ ))
close TEMPFILE;

my $kmz = Archive::Zip->new();
$kmz->addFile($mapTempLocation, "geogrape-$mapOutputId.kml") or die "Error adding file";

my $status = $kmz->writeToFileNamed($mapOutputLocation);
die "Error writing zip archive." if $status != AZ_OK;

`rm $mapTempLocation`;

print header;

print $mapOutputLocationUrl;
