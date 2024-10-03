/*

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
DISCLAIMER
The generation of actual melt data may be covered by U.S. Patent Nos. 7,582,429; 7,803,551; 8,068,992; 8,093,002; 8,296,074; 9,273,346; 
and other U.S. and foreign patents and patent applications owned by the University of Utah Research Foundation and licensed to 
BioFire Defense, LLC. If your PCR instrument is not licensed under these patents, please contact Jill Powlick at BioFire (jill.powlick@biofiredefense.com) 
for sublicensing information.
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

 * This file is subject to the terms and conditions defined on the dna-utah.org website and may not be used for external and/or commercial purposes without consent.
 *  [2024] dna-utah.org
 *  All Rights Reserved.

Future Feature List:
Screenshot
~Metadata in csv - Breaks csv
Tracker:
	Uploads count
	Interactions
	File downloads count
	Error log
Show area under derivative curve

Remove auto-detect?
Allow click and drag to go into the file
Show All/None, Delete All
Logging
	Uploads
		what kind?
	Click-drags
	Each time Derivative/Normalize/Overlay is used
	Export
	
	uMelt does: sequence, temp/fluor, index/temp, deriv of temp/fluor
	Logfile pseudocode:
	Open logfile
	Read logfile for given name
	If exists, increment
	Otherwise, append name and count
Settings
 */
//GUI position values
var w = 600, //Width of graph in pixels
	h = 250, //Height of graph in pixels
	//p = 50;  //Offset?
	yoff = 75,
	xoff = 50,
	xbuffer = 40,
	ybuffer = 20,
	legend_color_width=10,
	legend_color_height=10;
var temperature_label_align_x = 80,
	temperature_label_align_y = 45;
var helicity_label_align_y = -24,
	helicity_label_align_x = -90,
	helicity_derivitave_label_align_x = -50;
var raw_fluorescence_label_align_x = -40;
var fluorescence_label_align_x = -70;
var side_label_align_x = 80,
	side_label_align_y = 10;

//Constants
var MONO_DEFAULT = 20,
	MG_DEFAULT = 2.2,
	DMSO_DEFAULT = 0,
	UMELT_URL = "UPDATING DUE TO SERVER UPDATES",
    LOG_URL = "",
	WT_HET_SAMPLE_URL = "LS32_Example.txt",
	EXP_GENERIC_SAMPLE_URL = "GENERIC_DATA.gen",
	GENERIC_INDEX = 0,
	LS32_INDEX = 2,
	MAX_NAME_LEN = 30;

//2D offset cutoff where anything below this isn't added for 2D offset
var OFFSET_CUTOFF = 1.0;

//Helicity cutoffs where a normalized curve is discarded
var NORM_FAIL_UPPER = 125,
	NORM_FAIL_LOWER = -25;
	
var SGOLAY_WINDOW = 5,
	SGOLAY_POLYNOMIAL = 2;
	
var SMOOTH_SIZE = 15.0;

//Div names for the two graphs
var RAW_OUT_DIV = "raw_out",
	MOD_OUT_DIV = "mod_out";
var BRUSH_CONTAINER_ID = "brushcontainer";


var default_curve_name = "uMelt Prediction";

//x and y values for screenshotting
var SCREENSHOT_X = 500,
	SCREENSHOT_Y = 360;

//Initial color values for curves
var color_array = [
	"#000",//black
	"#A00",//red
	"#00A",//blue
	"#0A0",//green
	"#A0A",//purple
	"#AA0",//orange
	"#0AA"//yellow
];

//Display empty graphs
function initialize(){
	//Remove cursor numbers
	document.getElementById("low_cursor").value="";
	document.getElementById("high_cursor").value="";
	document.getElementById("sample_select").selectedIndex=0;
	display_graph([],[],RAW_OUT_DIV);//won't work
	display_graph([],[],MOD_OUT_DIV);
	fileTypeSelected();
	document.getElementById("overlay_checkbox").checked = false;
	document.getElementById("derivative_checkbox").checked = false;
	document.getElementById("normalize_checkbox").checked = false;
	document.getElementById("overlay_checkbox").disabled = true;
	//Reset uMelt curve name (maybe not???)
	/*
	var filedrag = document.getElementById("bodydiv");

	// file select
	//fileselect.addEventListener("change", FileSelectHandler, false);

	// is XHR2 available?
	var xhr = new XMLHttpRequest();
	if (xhr.upload) {

		// file drop
		//filedrag.addEventListener("dragover", FileDragHover, false);
		//filedrag.addEventListener("dragleave", FileDragHover, false);
		filedrag.addEventListener("drop", FileSelectHandler, false);
		//filedrag.style.display = "block";
	
		// remove submit button
		//submitbutton.style.display = "none";
	}
		// file drag hover
	//function FileDragHover(e) {
	//	e.stopPropagation();
	//	e.preventDefault();
	//	e.target.className = (e.type == "dragover" ? "hover" : "");
	//}
	*/
}


// file selection
function FileSelectHandler(e) {

	// cancel event and hover styling
	//FileDragHover(e);

	// fetch FileList object
	var files = e.target.files || e.dataTransfer.files;

	// process all File objects
	openMultipleFiles(e);
	//for (var i = 0, f; f = files[i]; i++) {
		//ParseFile(f);
	//}

}


var shownAlertSelect = false;
function fileTypeSelected(){
	var fileOption = document.getElementById("file_select");
	//var helptext = document.getElementById("upInfo96");
	if (fileOption.value == "CFX96" || fileOption.value == "LS96"){
		if (!shownAlertSelect){
			alert("For CFX96 and LS96 files, select both the .mlt and .tem files by holding shift when uploading.");
			shownAlertSelect = true;
		}
		//helptext.className = "";
	}else{
		//helptext.className = "hidden";
	}
}

//Function called when cursors are manually changed by inputting numbers
//This is NOT called with click&drag
function changeCursors(){
	if (rx != []){ //check if there is any data for cursoring
		var templow,temphigh,ilow=-1,ihigh=-1;
		templow = parseFloat(document.getElementById("low_cursor").value);
		temphigh = parseFloat(document.getElementById("high_cursor").value);
		if (!isNaN(templow) && !isNaN(temphigh)){//check if changed numbers are valid
			if (templow < temphigh){ //low needs to be less than the high!
				for (var i=2; i<rx[0].length; i++){
					if (ilow==-1 && rx[0][i] > templow){
						ilow=i-2;
					}else if (ilow!=-1 && ihigh==-1 && rx[0][i] > temphigh){
						ihigh=i-2;
					}
				}

				d3.select("#" + BRUSH_CONTAINER_ID)
					.transition()
					.call(brush.extent([rx[0][ilow],rx[0][ihigh]]))
					.call(brush.event);
				drawModified();
			}else{
				//Do nothing ?_?
				//Inform them of the problem ?_?
				//Swap low&high ?_?
			}
		}
	//search through the array "rx[0]" until the closest low and high index are found
	//set brush.extent()[0] and [1] if you can???	
	}
}


DNA = "atcgATCG";
function isDNA(seq){
	for (var i=0; i<seq.length; i++){
		var ok=false;
		for (var j=0; j<DNA.length; j++){
			if (DNA[j] == seq[i]){
				ok=true;
				break;
			}
		}
		if (!ok){
			return false;
		}
	}
	return true;
}

//Take uMelt xml and parse it into a data structure.
//Data structure is: {"x":[temperature values],"y":[helicity values]}
function parse_uMelt(xml){
	var ret = {},
		rxi1,rxi2,ryi1,ryi2,xarr,yarr,x=[],y=[];
	rxi1 = xml.search("<temperature>") + "<temperature>".length;
	rxi2 = xml.search("</temperature>");
	ryi1 = xml.search("<helicity>") + "<helicity>".length;
	ryi2 = xml.search("</helicity");
	xarr = xml.slice(rxi1,rxi2);
	yarr = xml.slice(ryi1,ryi2);
	xarr = xarr.split(" ");
	yarr = yarr.split(" ");
	for (var i=0; i<xarr.length; i++){
		x.push(parseFloat(xarr[i]));
		y.push(parseFloat(yarr[i]));
	}
	ret["x"] = x;
	ret["y"] = y;
	return ret;
}
function sample_call(){
	var index = document.getElementById("sample_select").selectedIndex;
	if (index == 2){
		current_fname = "sequenceExample_LS32";
		sample_WT_Het_Hom();
	}else if (index==3){
		current_fname = "GENERIC_DATA";
		sample_predictedToExperimental();
	}
}
function sample_predictedToExperimental(){
	var expHttp = new XMLHttpRequest();
	curve_names=[];
	rx=[];
	ry=[];
	mx=[];
	my=[];
	includes=[];
	expHttp.onreadystatechange = function(){
		if (expHttp.readyState === 4 && expHttp.status === 200){

			document.getElementById("file_select").selectedIndex = 0;
			var xml = expHttp.responseText;
			fileRead(xml);
			//set a brush?
			//set derivative/normalize?
			display_graph(rx,ry,RAW_OUT_DIV);
			drawModified();
		}
	}
	expHttp.open("GET", EXP_GENERIC_SAMPLE_URL, true);
	expHttp.send(null);
	var predHttp = new XMLHttpRequest();
	predHttp.onreadystatechange = function(){
		if (predHttp.readyState === 4 && predHttp.status === 200){
			var xml = predHttp.responseText;
			var xy = parse_uMelt(xml);
			var name = "uMelt Prediction";
			
			//Add curve, flag it as a predicted curve
			curve_names.push(name);
			includes.push(1);
			predicts.push(1);				
			updateLegend();

			rx.push(xy["x"]);
			ry.push(xy["y"]);

			display_graph(rx,ry,RAW_OUT_DIV);
			drawModified();
			
		}
	}
	var service_str = UMELT_URL + "?seq=tggTCGATCGATCGTACGTACGTACGTACGTTATATATATATTATATATAgAgtcgccgtgtgtccatgggtttATCGTAGCTAGCTAGCTAGCTACGTACGTACGTACGTACG&rs=0&cation=20&mg=2.2&dmso=0".toLowerCase();
	//var service_str = UMELT_URL + "?seq=tggTCGATCGATCGTACGTACGTACGTACGTTATATATATATTATATATAgAgtcgccgtgtgtccatgggtttATCGTAGCTAGCTAGCTAGCTACGTACGTACGTACGTACG"
	//	+ "&rs=0&cation=20&mg=2.2&dmso=0";
	predHttp.open("GET", service_str, true);
	predHttp.send(null);
	
	//remove all current curves and curve data
	
	//add the experimental curve from GENERIC_DATA.gen
	//predicted sequence to add: tggTCGATCGATCGTACGTACGTACGTACGTTATATATATATTATATATAgAgtcgccgtgtgtccatgggtttATCGTAGCTAGCTAGCTAGCTACGTACGTACGTACGTACG
}

function sample_WT_Het_Hom(){
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function(){
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200){
			//remove all current curves and curve data
			curve_names=[];
			rx=[];
			ry=[];
			mx=[];
			my=[];
			includes=[];
			predicts=[];
			document.getElementById("file_select").selectedIndex = 0;
			var xml = xmlHttp.responseText;
			fileRead(xml,0);
			//set a brush?
			//set derivative/normalize?
			display_graph(rx,ry,RAW_OUT_DIV);
			drawModified();
		}
	}
	xmlHttp.open("GET", WT_HET_SAMPLE_URL, true);
	xmlHttp.send(null);
}

//Calls uMelt and adds it as a curve
function add_uMelt_curve(){
	service_str = UMELT_URL;
	var seq = document.getElementById("sequence_input").value;
	seq = seq.trim();
	if (isDNA(seq)){
	
		//Get parameters
		var mono,mg,dmso, warnings="";
		mono = parseFloat(document.getElementById("mono_param").value);
		if (isNaN(mono)){
			warnings += "Couldn't read Mono input, set to default of " + MONO_DEFAULT + " mM\n";
			mono = MONO_DEFAULT;
		}
		mg = parseFloat(document.getElementById("mg_param").value);
		if (isNaN(mg)){
			warnings += "Couldn't read Mg input, set to default of " + MG_DEFAULT + " mM\n";
			mg = MG_DEFAULT;
		}
		dmso = parseFloat(document.getElementById("dmso_param").value);
		if (isNaN(dmso)){
			warnings += "Couldn't read DMSO input, set to default of " + DMSO_DEFAULT + " %\n";
			dmso = DMSO_DEFAULT;
		}
		service_str += "?seq=" + seq +
			"&rs=0&cation=" + mono +
			"&mg=" + mg +
			"dmso=" + dmso;

		//Do the uMelt call
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState === 4 && xmlHttp.status === 200){
				var xml = xmlHttp.responseText;
				var xy = parse_uMelt(xml);
				var name = document.getElementById("name_input").value;
				
				//Add curve, flag it as a predicted curve
				curve_names.push(name);
				includes.push(1);
				predicts.push(1);				
				updateLegend();
				//Shift the curve based on input before adding curve data
				/*var shift = parseInt(document.getElementById("shift_param").value);
				for (var i=0; i<xy["x"].length; i++){
					xy["x"][i] += shift;
				}*/
				rx.push(xy["x"]);
				ry.push(xy["y"]);

				display_graph(rx,ry,RAW_OUT_DIV);
				drawModified();
			}
		}
		xmlHttp.open("GET", service_str, true);
		xmlHttp.send(null);
		//probably do this in callback
	}else{
		alert("Sequence isn't DNA");
	}
}

function sendStat(name,count){
	var http = new XMLHttpRequest();
	var service_str = LOG_URL + "?name="+name+"&count="+count;
	//	+ "&rs=0&cation=20&mg=2.2&dmso=0";
	predHttp.open("POST", service_str, true);
	predHttp.send(null);
}
//(attempts to) return a unique color given an index
function color(index){
	if (index < color_array.length){
		return color_array[index];
	}
	var r,g,b;
	r = (150 * (index+1)) % 255;
	g = (120 * (index+1)) % 255;
	b = (90 * (index+1)) % 255;
	return "rgb(" + r + "," + g + "," + b + ")";
}

function getReferenceCurve(){
	return document.getElementById("reference_select").selectedIndex-1;
}

function parseAny(data, fname){
	var d = data.trim().split(/\r\n|\r|\n|\t/g);
	var firstx=0, firsty=1;
	var onex = true;
	//alert(d[0]);
	if (!isNaN(d[0])){//conclusive multi file, inconclusive which file or whether you should wait or not
		//figure out double files...
	}else if (d[0] == "Index"){ //inconclusive, but it'd multiple melt curves in one file
		if (d[1] == "Text"){
			return parseRotorgene(data);
		}else if (d[1] == "X"){
			return parseLC480(data);
		}else{
			return false;
		}
	}else if (d[0] == "X"){//whenever you see "X" it's conclusive. Multiple melt curves and separate temperatures each curve
		return parseLS32(data);
	}else if (d[0] == "Run Info:"){//conclusive HR1 file. Seeing ".vs2" does the same thing though
		return parseVS2(data);
	}else if (d[0] == ""){//not sure if conclusive, but it's a start
		return parseBioRad(data);
	}else if (d[0] == "Temperature"){
		if (d[1] == "Fluorescence"){
			return parseGeneric(data);
		}else{
			return parseBioRad(data);	
		}
	}else if (d[0] == "Temperature\\Fluorescence (RFU)"){//conclusive LC96 (one temperature for all curves)
		return parseLC96(data);
	}
	return false;
}

//first line is "Temperature\tFluorescence"
//T/F on column 0/1
function parseGeneric(data){
	var d = data.split(/\r\n|\r|\n/g);
	var xy = [];
	xy.push({"name":current_fname,"x":[],"y":[]});
	for (var i=0; i<d.length; i++){
		if (i>0){
			var line = d[i].split("\t");
			if (line.length > 1){//to ignore empty lines
				xy[0]["x"].push(parseFloat(line[0]));
				xy[0]["y"].push(parseFloat(line[1]));
			}
		}
	}
	return xy;
}
//first 2 lines have metadata run info we don't use. 3rd has legend
//T/F on column 1/2
function parseVS2(data){ //aka HR1
	var d = data.split(/\r\n|\r|\n/g);
	var xy = [];
	xy.push({"name":current_fname,"x":[],"y":[]});
	for (var i=0; i<d.length; i++){
		if (i>2){ //truncate first few lines
			var line = d[i].split("\t");
			if (line.length > 3){//to ignore empty lines
				xy[0]["x"].push(parseFloat(line[1]));
				xy[0]["y"].push(parseFloat(line[2]));
			}
		}
	}
	return xy;
}
//first line has "X\tN:name\t" repeated per sample where N is the number
function parseLS32(data){
	var samples = [], sampleLength=0;
	var lines = data.split(/\r\n|\r|\n/g);
	var metadata = lines[0].trim().split("\t");
	for (var i=1; i<metadata.length; i+=2){
		samples.push({"name":metadata[i],"x":[],"y":[]});
	}
	var line;
	for (var i=1; i<lines.length; i++){
		line = lines[i].trim().split("\t");
		for (var j=0; j<line.length; j++){
			var num = parseFloat(line[j]);
			if (j%2==0){
				samples[Math.floor(j/2)]["x"].push(num);
			}else{
				samples[Math.floor(j/2)]["y"].push(num);
			}
		}
	}
	return samples;
}

function parseQS3(data){
	var samples = [], sampleLength=0;
	var lines = data.split("\n");
	var old = 'xx'; var olds = [];
	for (var i=2; i<lines.length; i++){
		var line = lines[i].trim().split("\t");
		if(line.length>1){
				
			var cctv = line[1];
			if(cctv == old){
			}else{
			samples.push({"name":cctv,"x":[],"y":[]});
			olds.push(cctv);
			}
			old = cctv;
		}
	}
	
	
	for(var z=0; z<olds.length; z++){
		
		for (var i=1; i<lines.length; i++){
			
			var line = lines[i].split("\t");
			if(line.length>1){
				var fl = line[4].replace(/,/g, '');
				if(line[1] == olds[z]){
					var num1 = parseFloat(line[3]);
					var num2 = parseFloat(fl)/10000;
					
					samples[z]["x"].push(num1);
					samples[z]["y"].push(num2);
				}
			}
		}
		
	}
	

	return samples;
}
//first line is "Temperature\tAbsorbance"
//T/F on column 0/1
function parseAbsorbance(data){
	var d = data.split(/\r\n|\r|\n/g);
	var xy = [];
	xy.push({"name":current_fname,"x":[],"y":[]});

        var minVal = 100000;
    	for (var i=0; i<d.length; i++){
		if (i>0){
			var line = d[i].split(",");
			if (line.length > 1){//to ignore empty lines
				var curNum = parseFloat(line[1]) * -1;
                if(curNum<minVal){minVal=curNum;}
			}
		}
	}

	for (var i=0; i<d.length; i++){
		if (i>0){
			var line = d[i].split(",");
			if (line.length > 1){//to ignore empty lines
				xy[0]["x"].push(parseFloat(line[0]));
                var yvalue = parseFloat(line[1]);
                //yvalue = yvalue * -1;  yvalue = yvalue - minVal;
				xy[0]["y"].push(yvalue);
			}
		}
	}

	return xy;
}

function transformAbsorbance(d){
	var xy = [];

        var minVal = 100000;
    	for (var i=0; i<d.length; i++){
				var curNum = d[i]*-1;
                if(curNum<minVal){minVal=curNum;}
			
		}
	
	for (var i=0; i<d.length; i++){
                var yvalue = d[i];
                yvalue = yvalue * -1;  yvalue = yvalue - minVal;
				xy.push(yvalue);
			}
		
	

	return xy;
}

//first line has "Index\tText\tX\tN:name\t" where X\tN:name\t" is repeated per sample although names don't seem useful
function parseRotorgene(data){
	var samples = [], sampleLength=0;
	var lines = data.split(/\r\n|\r|\n/g);
	var metadata = lines[0].trim().split("\t");
	for (var i=3; i<metadata.length; i+=2){
		samples.push({"name":metadata[i],"x":[],"y":[]});
	}
	var line;
	for (var i=1; i<lines.length; i++){
		line = lines[i].trim().split("\t");
		for (var j=2; j<line.length; j++){
			var num = parseFloat(line[j]);
			if (j%2==0){
				samples[Math.floor((j-2)/2)]["x"].push(num);
			}else{
				samples[Math.floor((j-2)/2)]["y"].push(num);
			}
		}
	}
	return samples;
}
//first line has "Index\tX\tName\t" where X\tName\t is repeated per sample
function parseLC480(data){ //nearly identical to ls32
	
	var samples = [], sampleLength=0;
	var lines = data.split(/\r\n|\r|\n/g);
	var metadata = lines[0].trim().split("\t");
	if (metadata[0]!="Index") return parseLS32(data); //bandaid if they don't have index column
	for (var i=2; i<metadata.length; i+=2){
		samples.push({"name":metadata[i],"x":[],"y":[]});
	}
	var line;
	var high_y=0;
	for (var i=1; i<lines.length; i++){
		line = lines[i].split("\t");
		for (var j=1; j<line.length; j++){
			var num = parseFloat(line[j]);
			if (j%2==1){
				samples[Math.floor((j-1)/2)]["x"].push(num);
			}else{
				if (num > high_y) high_y=num;
				samples[Math.floor((j-1)/2)]["y"].push(num);
			}
		}
	}
	var normalization_factor = high_y/100;
	for (var i=0; i<samples.length; i++){
		for (var j=0; j<samples[i]["y"].length; j++){
			samples[i]["y"][j]/=normalization_factor;
		}
	}
	return samples;
}


//first line has "Temperature/Fluorescence (RFU)\tSample Name\t" where Sample Name\t is repeated (on fluorescence)
function parseLC96(data){
	var samples = [], sampleLength=0;
	var lines = data.split(/\r\n|\r|\n/g);
	var metadata = lines[0].trim().split("\t");
	for (var i=1; i<metadata.length; i++){
		samples.push({"name":metadata[i],"x":[],"y":[]});
	}
	var line;
	var high_y=0, low_y=9999999;
	for (var i=1; i<lines.length; i++){
		line = lines[i].trim().split("\t");
		var xdatum = parseFloat(line[0]);
		for (var j=1; j<line.length; j++){
			var ydatum = parseFloat(line[j]);
			samples[j-1]["x"].push(xdatum);
			samples[j-1]["y"].push(ydatum);
			if (ydatum > high_y) high_y=ydatum;
			if (ydatum < low_y) low_y=ydatum;
		}
	}
	var normalization_factor_high = high_y/100;
	var normalization_factor_low = low_y;
	for (var i=0; i<samples.length; i++){
		for (var j=0; j<samples[i]["y"].length; j++){
			samples[i]["y"][j]-=normalization_factor_low;
			samples[i]["y"][j]/=normalization_factor_high;
		}
	}
   
	return samples;
    
}
//first line has "\tTemperature\tName" with \tName repeating per sample
function parseBioRad(data){
	var samples = [], sampleLength=0;
	var lines = data.split(/\r\n|\r|\n/g); //split all newlines
	var metadata = lines[0].split("\t");
	//var test="\n";
	//alert("Debug:\ndata[324] = " + data.charCodeAt(324) + "\ndata[325] = " + data.charCodeAt(325) + "\nLines.length = " + lines.length + "\nLines[0].length = " + lines[0].length + "\nTest: " + data.charCodeAt(0));
	for (var i=2; i<metadata.length; i++){
		samples.push({"name":metadata[i],"x":[],"y":[]});
	}
	var line;
	var high_y=0, low_y=9999999;
	for (var i=1; i<lines.length; i++){
		line = lines[i].split("\t");
		var xdatum = parseFloat(line[1]);
		for (var j=2; j<line.length; j++){
			var ydatum = parseFloat(line[j]);
			samples[j-2]["x"].push(xdatum);
			samples[j-2]["y"].push(ydatum);
			if (ydatum > high_y) high_y=ydatum;
			if (ydatum < low_y) low_y=ydatum;
		}
	}
	var normalization_factor_high = high_y/100;
	var normalization_factor_low = low_y;
	for (var i=0; i<samples.length; i++){
		for (var j=0; j<samples[i]["y"].length; j++){
			samples[i]["y"][j]-=normalization_factor_low;
			samples[i]["y"][j]/=normalization_factor_high;
		}
	}
    
	return samples;
   
}

function parseLS96(mltData, temData){
	//mlt files have 96 entries per line. each entry is a data point per curve
	//tem files have one line with 96 entries. This is temperature data
	var tem,mlt,mlt96, samples=[], t_arr=[], ydatum, line, low_y=9999999, hi_y=0;
	tem = temData.trim().split('\t');
	mlt = mltData.trim().split(/\r\n|\r|\n/g);
	//test if tem and mlt are same size
	if (tem.length != mlt.length){
		tem = temData.trim().split(/\r\n|\r|\n/g);
		//if ( (tem.length != mlt.length) &&  (tem.length != 1+mlt.length) ) {
		//	alert("tem and mlt files don't match up - LS96");
		//	return [];
		//}
	}
	mlt96 = mlt[0].trim().split('\t');
	for (var i=0; i<tem.length; i++){
		t_arr.push(parseFloat(tem[i]));
	}

    var labelLine = mlt[0].split('\t');
     if(isNaN(labelLine[0])){
	    for (var i=0; i<mlt96.length; i++){
            samples.push({"name":labelLine[i], "x":t_arr, "y":[]});	
        }

        	for (var i=1; i<mlt.length; i++){
		line = mlt[i].split('\t');
		for (var j=0; j<samples.length; j++){
			ydatum = parseFloat(line[j]);
			if (low_y > ydatum) low_y = ydatum;
			if (hi_y < ydatum) hi_y = ydatum;
			samples[j]["y"].push(ydatum);
		}
	}

    }else{
        for (var i=0; i<mlt96.length; i++){
            samples.push({"name":i+1, "x":t_arr, "y":[]});	
        }

        	for (var i=0; i<mlt.length; i++){
		line = mlt[i].split('\t');
		for (var j=0; j<samples.length; j++){
			ydatum = parseFloat(line[j]);
			if (low_y > ydatum) low_y = ydatum;
			if (hi_y < ydatum) hi_y = ydatum;
			samples[j]["y"].push(ydatum);
		}
	}

    }



	var normalization_factor_high = hi_y/100;
	var normalization_factor_low = low_y;
	for (var i=0; i<samples.length; i++){
		for (var j=0; j<samples[i]["y"].length; j++){
			samples[i]["y"][j]-=normalization_factor_low;
			samples[i]["y"][j]/=normalization_factor_high;
		}
	}
	return samples;
}

/*
function parseCFX96(mltData, temData){
	var tem,mlt,mlt96, samples=[], t_arr=[], ydatum, line, low_y=9999999, hi_y=0;
	tem = temData.split(/\r\n|\r|\n/g);
	mlt = mltData.split(/\r\n|\r|\n/g);
	//test if tem and mlt are same size
	if (tem.length != mlt.length){
		if (temData.split('\t').length == 

		alert("tem and mlt files don't match up");
		return [];
	}
	mlt96 = mlt[0].split('\t');
	for (var i=0; i<tem.length; i++){
		t_arr.push(parseFloat(tem[i]));
	}
	for (var i=0; i<mlt96.length-1; i++){
		samples.push({"name":i+1, "x":t_arr, "y":[]});	
	}
	for (var i=0; i<mlt.length-1; i++){
		line = mlt[i].split('\t');
		for (var j=0; j<samples.length; j++){
			ydatum = parseFloat(line[j]);
			if (low_y > ydatum) low_y = ydatum;
			if (hi_y < ydatum) hi_y = ydatum;
			samples[j]["y"].push(ydatum);
		}
	}
	var normalization_factor_high = hi_y/100;
	var normalization_factor_low = low_y;
	for (var i=0; i<samples.length; i++){
		for (var j=0; j<samples[i]["y"].length; j++){
			samples[i]["y"][j]-=normalization_factor_low;
			samples[i]["y"][j]/=normalization_factor_high;
		}
	}
	return samples;
}
*/
//takes a file, puts it in the right parsing funciton and adds the curve(s)
function fileRead(text){	
	var fileOption = document.getElementById("file_select");
	var samples;
	if(fileOption.value == "AutoDetect"){
		samples = parseAny(text);
	}else if(fileOption.value == "HR1"){
		samples = parseVS2(text);
	}else if(fileOption.value == "Generic"){
		samples = parseGeneric(text);
	}else if(fileOption.value == "LS32"){
		samples = parseLS32(text);
	}else if(fileOption.value == "Rotorgene"){
		samples = parseRotorgene(text);
	}else if (fileOption.value == "LC480"){
		samples = parseLC480(text);
	}else if (fileOption.value == "LC96"){
		samples = parseLC96(text);			
	}else if (fileOption.value == "BioRad"){
		samples = parseBioRad(text);
	}else if (fileOption.value == "QuantStudio"){
		samples = parseQS3(text);
	}else if (fileOption.value == "Absorbance"){
		samples = parseAbsorbance(text);
	}
	var sample_size = samples.length;
	for (var i=0; i<sample_size; i++){
		curve_names.push(samples[i]["name"]);
		rx.push(samples[i]["x"]);
		ry.push(samples[i]["y"]);
		mx.push(samples[i]["x"]);
		my.push(samples[i]["y"]);
		includes.push(1);
		predicts.push(0);
	}
	updateLegend();
}

function doubleFileRead(mltText, temText){
	//parse like above? probably in different functions
	var fileOption = document.getElementById("file_select");
	var samples;
	//if (fileOption.value == "CFX96"){
	//	samples = parseCFX96(mltText, temText);
	//}
	samples = parseLS96(mltText, temText);
	//alert("ss: " + samples.length);
	var sample_size = samples.length;
	for (var i=0; i<sample_size; i++){
		curve_names.push(samples[i]["name"]);
		rx.push(samples[i]["x"]);
		ry.push(samples[i]["y"]);
		mx.push(samples[i]["x"]);
		my.push(samples[i]["y"]);
		includes.push(1);
		predicts.push(0);
	}
	updateLegend();
}

//open file, parse it, and display graph
var rx=[],ry=[]; //the raw data
var mx=[],my=[]; //the modded data
var curve_names=[]; //names of the files
var includes=[];
var predicts=[];
var current_fname;
//var opened_files=0;
function selectall(){
	for (var i=0; i<curve_names.length; i++){
		includes[i] = 1;
		document.getElementById("legend_box_"+i).checked = true;
	}
	display_graph(rx,ry,RAW_OUT_DIV);
	drawModified();
}
function selectnone(){
	for (var i=0; i<curve_names.length; i++){
		includes[i] = 0;
		document.getElementById("legend_box_"+i).checked = false;
	}
	display_graph(rx,ry,RAW_OUT_DIV);
	drawModified();	
}
function removeall(){
	if (confirm("Are you sure you want to remove all curves?") == true){
		rx=[], ry=[], curve_names=[], includes=[], predicts=[];
		brush.clear();
		brushextent=null;
		var reference_select = document.getElementById("reference_select");
		while (reference_select.hasChildNodes()) {  
		    reference_select.removeChild(reference_select.firstChild);
		}
	    var option = document.createElement("option");
		option.text = "Select Reference Curve";
		reference_select.add(option,0);
		display_graph(rx,ry,RAW_OUT_DIV);
		drawModified();
	}
}
var doubleFile = false;

function openMultipleFiles(event){
	var files = event.target.files;
	//var readers = [];
	var doubleFileData = "";
	var doubleFileName = "";
	doubleFile=false;
	function setup_reader(file){
		var fileOption = document.getElementById("file_select");
		
		/*if (!(fileOption.value == "CFX96" || fileOption.value == "LS96")){
			var reader = new FileReader();
			reader.onload = function(e){
				current_fname = file.name;
				fileRead(reader.result);
				//xy = fileRead(reader.result);//this should be changed
				//rx.push(xy[0]);
				//ry.push(xy[1]);
				//mx.push(xy[0]);
				//my.push(xy[1]);
				//display_graph(MOD_OUT_DIV);
				//opened_files+=1;
				//if (opened_files == curve_count){
				display_graph(rx,ry,RAW_OUT_DIV);
				drawModified();
				//}
			}
			//TODO: check if it's already in curve_names
			//curve_names.push(name);
			//includes.push(1);
			//predicts.push(0);
			reader.readAsText(file);
			updateLegend();
		}else{
		*/
		var reader = new FileReader();
		reader.onload = function(e){
			file.name = truncateIfLong(file.name);
			current_fname = file.name;
			var fname_split = current_fname.split(".");
			var fname_ext = fname_split[fname_split.length-1];
			if (fname_ext == "mlt" || fname_ext == "tem"){
				//alert("In if statement. df: " + doubleFile);
				if (doubleFile){
					current_fname = current_fname.slice(0,current_fname.length-4);
					if (fname_ext == "mlt"){
						doubleFileRead(reader.result, doubleFileData);
					}else{
						doubleFileRead(doubleFileData, reader.result);
					}
					doubleFile=false;
				}else{
					//alert("setting df to true");
					doubleFile= true;
					doubleFileName = current_fname;
					doubleFileData = reader.result;
				}
			}
			fileRead(reader.result,document.getElementById("file_select"));
			display_graph(rx,ry,RAW_OUT_DIV);
			drawModified();
		}
		reader.readAsText(file);
		updateLegend();
	//}
	}
	var hasMlt = false;
	var hasTem = false;
	var filext;
	for (var i=0; i<files.length; i++){
		filext = files[i].name.split(".");
		filext = filext[filext.length-1];
		if (filext == "mlt"){
			hasMlt = true;
		}else if (filext == "tem"){
			hasTem = true;
		}
		setup_reader(files[i]);
	}
	if (hasMlt != hasTem){
		alert("Please select both .mlt and .tem files when uploading.");
	}
		/*var reader = new FileReader();
		readers.push(reader);
		var file = files[i];
		readers[i].onload = function(){
			xy = getTempFluor(readers[i].result);
			rx.push(xy[0]);
			ry.push(xy[1]);
			
		};
		readers[i].readAsText(file);
		*/
}
/*
function numberDuplicatedNames(){
	for (var i=0; i<curve_names.length; i++){
		var curve_name = curve_names[i];
		var count=1;
		for (var j=i+1; j<curve_names.length; j++){
			if (curve_names[j]==curve_name){
				curve_names[j] = curve_name + " " + count;
				count++;
			}
		}
	}
}
*/

//Draws the legend
/*
function updateLegend(){
	var legend = document.getElementById("legend");
	legend.innerHTML="";
	var text="";
	for (var i=0; i< curve_names.length; i++){
		text += 
			"<svg width="+legend_color_width+" height="+legend_color_height+">"+
			"<rect width="+legend_color_width+" height="+legend_color_height+
			" style=\"fill:"+color(i)+"\"></rect></svg>"+
			"<input type=\"checkbox\" id=\"legend_box_"+i+
			"\" onchange=\"changeLegend("+i+")\"";
		if (includes[i] == 1){
			text += "checked";
		}
		text += ">"+curve_names[i]+"</input><br>";
	}
	legend.innerHTML = text;
}
*/

//newer version being developed

function updateLegend(){
	var legend = document.getElementById("legend");
	legend.innerHTML="";
	var ref = getReferenceCurve();
	var reference_select = document.getElementById("reference_select");
	var ref_len = reference_select.children.length;
	for (var i=0; i<curve_names.length; i++){
		if (ref_len <= i+1){
			//This will produce bugs if I allow elements to be deleted.
			//Maybe if I delete all options on the list and recreate them all it'll work... 
			//	I'll probably also have to save the old selection and set it back
			var option = document.createElement("option");
			option.text = curve_names[i];
			reference_select.add(option,reference_select[i+1]);
		}
	}
	//dunno if there's a better way to code this
	var text;
	if (ref >= 0 && !brush.empty() &&
		document.getElementById("normalize_checkbox").checked && document.getElementById("overlay_checkbox").checked && (document.getElementById("derivative_checkbox").checked==false) ){
		//use tables to show 2D offset
		var ref_arr=[];
		ref_arr = get2DOffsets(ref);

		text="<table class=\"legend_table\">";
		for (var i=0; i< curve_names.length; i++){
			//check if normalization has failed and
		 
			if (my[i]==0) //if normalization failed
				text +="<tr class = \"norm_fail\" title=\"Normalization on this curve failed\">";
			else
				text +="<tr>";
			text+="<td class = \"legend_name\"><svg width="+legend_color_width+" height="+legend_color_height+">"+
				"<rect width="+legend_color_width+" height="+legend_color_height+
				" style=\"fill:"+color(i)+"\"></rect></svg>"+
				"<input type=\"checkbox\" id=\"legend_box_"+i+
				"\" onchange=\"changeLegend("+i+")\"";
			if (includes[i] == 1){
				text += "checked";
			}
			text += ">"+truncateIfLong(curve_names[i])+"</input></td><td>";
			if (my[i]==0 || includes[i]==0)
				text+="-";
			else
				text+=ref_arr[i];
			text += "</td>" + "</tr>";
		}
		text += "</table>";
	}else{ //don't use tables to show 2D offset
		text="";
		for (var i=0; i<curve_names.length; i++){
			if (my[i]==0)
				text +="<div class = \"norm_fail\" title=\"Normalization on this curve failed\">";
			text+="<svg width="+legend_color_width+" height="+legend_color_height+">"+
				"<rect width="+legend_color_width+" height="+legend_color_height+
				" style=\"fill:"+color(i)+"\"></rect></svg>"+
				"<input type=\"checkbox\" id=\"legend_box_"+i+
				"\" onchange=\"changeLegend("+i+")\"";
			if (includes[i] == 1){
				text += "checked";
			}
			text += ">"+truncateIfLong(curve_names[i])+"</input>";
			if (my[i]==0)
				text+="</div>";
			else
				text+="<br>"
		}
	}
	legend.innerHTML = text;
	/*
	var overlay_legend = document.getElementById("offset_legend");
	if (document.getElementById("overlay_checkbox").checked){
		overlay_legend.className = "offset_legend";
		//put in placeholder text for now
		text="";
		//if statement to check if normalize and a reference curve is selected
		for (var i=0; i<curve_names.length; i++){
			//do 2D offset calculation here
			text+="N/A<br>";
		}
		overlay_legend.innerHTML = text;
	}else{
		overlay_legend.className = "hidden offset_legend";
	}
	*/
}
function get2DOffsets(reference){
	var arr=[];
	for (var i=0; i<mx.length; i++){
		if (i!=reference){
			arr.push(Math.round(calculate_2d_offset(mx[i],my[i],mx[reference],my[reference])));
		}else{
			arr.push(0);
		}
	}
	return arr;
}
//toggle visibility of curve i
function changeLegend(i){
	if (includes[i]==1)
		includes[i]=0;
	else
		includes[i]=1;
	display_graph(mx,my,MOD_OUT_DIV);
	display_graph(rx,ry,RAW_OUT_DIV);
}

var mod_x, raw_x; //domains to modify graph
var area, xaxis;
var brush;
var brushextent=null;
var brushcontainer;
var ytext_mod; //the y-axis text that changes with using derivative
var minY=0;
//use d3 to display graph with x and y arrays
function display_graph(xdata,ydata,outdiv){ //xy
	//outdiv default to "mod_out"
	outdiv = typeof outdiv !== 'undefined' ? outdiv : MOD_OUT_DIV;
	var out = "#" + outdiv;
	
	//replace the graph if it's already there
	document.getElementById(outdiv).innerHTML = "";
	var maxval = 0,
		maxy = 0,
		sampsize = 0;
	var label_array = new Array(),
		val_array1 = [];
	var minx=100,maxx=0;
	//max of x's
	//find biggest x range, use that for datax
	for (var i=0; i<xdata.length; i++){
		if (includes[i]==1 && (predicts[i]==0 || outdiv == MOD_OUT_DIV)){
			var arr = new Array();
			if (sampsize<xdata[i].length){
				sampsize = xdata[i].length;
			}
			for (var j=0; j<xdata[i].length; j++){
	
				//maybe this should be changed?
				arr[j] = { x: xdata[i][j], y: ydata[i][j] };
				if (xdata[i][j] > maxx){
					maxx=xdata[i][j];
				}
				if (xdata[i][j] < minx){
					minx=xdata[i][j];
				}
				if (ydata[i][j] > maxy){
					maxy=ydata[i][j];
				}
				if (label_array.length < xdata[i][j].length){
					label_array[j] = parseFloat(xdata[i][j]);
				
				}
			}
			val_array1.push(arr);
		}else{
			val_array1.push([0]);
		}
	}
	if (minx == 100 && maxx == 0){//empty graph
		maxy = 100;
		minx = 0;
		maxx = 100;
	}
	maxval = 100; //maybe calculate it instead of 100?
	//find max of y's
	
	
	var x = d3.scale.linear().domain([minx, maxx]).range([0,w]),
		y = d3.scale.linear().domain([minY, maxy]).range([h,0]);
	
	//Initialize svg
	var vis = d3.select(out)
		.append("svg:svg")
		.attr("width", w + xoff)
		.attr("height", h + yoff)
		.append("svg:g")
		.attr("transform", "translate(" + xbuffer + "," + ybuffer  + ")");

	//Initialize ticks
	var xrules = vis.selectAll("g.xrule")
		.data(x.ticks(10))
		.enter().append("svg:g")
		.attr("class", "xrule");

	//Draw grid lines	
	xrules.append("svg:line")
		.attr("x1", x)
		.attr("x2", x)
		.attr("y1", 1)
		.attr("y2", h - 1);

	var yrules = vis.selectAll("g.yrule")
		.data(y.ticks(10))
		.enter().append("svg:g")
		.attr("class", "yrule");
	
	yrules.append("svg:line")
		.data(y.ticks(10))
		.attr("y1", y)
		.attr("y2", y)
		.attr("x1", 0)
		.attr("x2", w - 10);
		
	xrules.append("svg:text")
		.attr("x", x)
		.attr("y", h + 15)
		.attr("dy", ".71em")
		.attr("text-anchor", "middle")
		.text(function(d){return d.toPrecision(3);});
		
	//y axis numbers
	yrules.append("svg:text")
		.data(y.ticks(10))
		.attr("y", y)
		//.attr("x", -10)
		.attr("dy", ".35em")
		.attr("text-anchor", "end")
		.text(y.tickFormat(".0f"));

	s="";
	// Series I
	//Line between each point
	for (var i=0; i<val_array1.length; i++){
		if (val_array1[i] != [0]){
		//if (includes[i]==1){
		//	if (predicts[i]==0 || outdiv == MOD_OUT_DIV){
			
				vis.append("svg:path")
				   .data([val_array1[i]])
				   .attr("class", "line")
				   .attr("fill", "none")
				   .attr("stroke", function(d){
					return color(i);
				   })
				   //.style("stroke", function(d) { return color[d.sample]; })
				   .attr("stroke-width", 3)
				   .attr("d", d3.svg.line()
					 .x(function(d) { //can probably change now that I don't need to debug
						var a=x(d.x);
						 s+= d.x + ", ";
						return a; 
					 })
					 .y(function(d) { return y(d.y); }));
					 //.x(function(d) { return d[0]; })
					 //.y(function(d) { return d[1]; }));
		//	}
		//}
		}
		s+= "<br>";
	}
	//document.getElementById("debugout1").innerHTML =s;
	
	//Make an array of arrays and use val_arrays for that
	//Circle on each point takes too much time to calculate and only makes the graph thicker
	/*
	for (var i=0; i<val_array1.length; i++){
		var s = "circle.line" + i.toString();
		vis.selectAll(s)
			//.append("svg:circle")
			.data(val_array1[i])
			.enter().append("svg:circle")
			
			.attr("class", "line")
			.attr("stroke", function(d) { return color(i); })
			.attr("fill", "steelblue" )
			.attr("cx", function(d) { return x(d.x); })
			.attr("cy", function(d) { return y(d.y); })
			.attr("r", 1);
	}*/
	//Apply x axis label
	vis.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", (w/2)+temperature_label_align_x)
		.attr("y", h+temperature_label_align_y)
		.text("Temperature (ËšC)");
	//not sure I like this code, but it's held up
	if (outdiv == MOD_OUT_DIV){
		mod_x = x;
		//Apply the y axis label
		ytext_mod = vis.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "end")
			.attr("y", helicity_label_align_y)
			.attr("x", fluorescence_label_align_x)
			.attr("transform", "rotate(-90)")
			.text("Fluorescence");
		//Apply label showing modified data
		//vis.append("text")
		//	.attr("class", "sidelabel")
		//	.attr("y", side_label_align_y)
		//	.attr("x", w-side_label_align_x)
		//	.text("Analyzed Data");

                var ref = getReferenceCurve();
                    if(document.getElementById("difference_checkbox").checked==true){
                            if(ref > -1){
                                var jj = "vs. Reference" ;//+ document.getElementById("reference_select").value;
                                vis.append("text")
			                    .attr("class", "sidelabel")
			                    .attr("y", side_label_align_y)
			                    .attr("x", w-side_label_align_x)
			                    .text(jj);}
                            else{
                               vis.append("text")
			                    .attr("class", "sidelabel")
			                    .attr("y", side_label_align_y)
			                    .attr("x", w-side_label_align_x)
			                    .text("vs. Average");
                            }

                }else{
                        vis.append("text")
			                    .attr("class", "sidelabel")
			                    .attr("y", side_label_align_y)
			                    .attr("x", w-side_label_align_x)
			                    .text("Analyzed Data");

                    }
	        


	}else if (outdiv == RAW_OUT_DIV){
		//needs area and xaxis (what is this comment?)
		raw_x = x;
		//Brush for cursors
		brush = d3.svg.brush()
	    	.x(raw_x)
   			.on("brushend", drawModified);

		//append the brush to one of the xrules
		vis.select("g.xrule")//.xrules.append("g")
			.append("g")
      		.attr("class", "x brush")
      		.attr("id",BRUSH_CONTAINER_ID)
      		.call(brush)
    		.selectAll("rect")
      		.attr("y", -6)
      		.attr("height", h + 7);
		if (brushextent==null){
    		brushextent = brush.extent();
		}else{
			d3.select("#" + BRUSH_CONTAINER_ID)
				//.transition(0)
				.call(brush.extent(brushextent))
				.call(brush.event);
		}
      	//Apply the Y axis label
        if(document.getElementById("file_select").value == 'Absorbance'){
		vis.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "end")
			.attr("y", helicity_label_align_y)
			.attr("x", raw_fluorescence_label_align_x)
			.attr("transform", "rotate(-90)")
			.text("Raw Absorbance");
        }else{
		vis.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "end")
			.attr("y", helicity_label_align_y)
			.attr("x", raw_fluorescence_label_align_x)
			.attr("transform", "rotate(-90)")
			.text("Raw Fluorescence");
        }

		//Apply label showing original data
		vis.append("text")
			.attr("class", "sidelabel")
			.attr("y", side_label_align_y)
			.attr("x", w-side_label_align_x)
			.text("Original Data");
	}
}

var norm_alert = false;
var overlay_alert = false;


//In short: the refresh function on a modified graph
//Modify and draw curves according to input, parameters and methods
//Modifications:
//	Trim areas of the curve where cursors were input
//	Normalize curve
//	Overlay predicted to experimental
//	Display derivative
function drawModified(){
	var drawx, drawy;
	//Somewhat janky fix to alert user about normalization
	//Changing HTML file to allow a different
	var norm_checkbox = document.getElementById("normalize_checkbox");
    var normex_checkbox = document.getElementById("normalize_exp_checkbox");
	var overlay_checkbox = document.getElementById("overlay_checkbox");
    var deriv_checkbox = document.getElementById("derivative_checkbox");
    var diff_checkbox = document.getElementById("difference_checkbox");
    var fileOption = document.getElementById("file_select");
    if (deriv_checkbox.checked && diff_checkbox.checked){
            deriv_checkbox.checked =false;
        }
    if (norm_checkbox.checked && normex_checkbox.checked){
            //normex_checkbox.checked =false;
        }
    

	if (!norm_alert && brush.empty() && (norm_checkbox.checked || normex_checkbox.checked)){
		alert("Please select a cursor region for normalization. You can click and drag raw data or manually input cursors.");
		norm_alert = true;
	}else if (!norm_alert && !brush.empty() && (norm_checkbox.checked || normex_checkbox.checked)){
		norm_alert = true;
	}
	if (norm_checkbox.checked || normex_checkbox.checked){
		overlay_checkbox.disabled=false;
	}else{
		overlay_checkbox.checked=false;
		overlay_checkbox.disabled=true;
	}
	var ref = getReferenceCurve();
	if (!overlay_alert && ref == -1 && overlay_checkbox.checked){
		alert("Select a reference curve to overlay other curves to.");
		overlay_alert = true;
	}else if (ref >= 0 && !overlay_alert){
		overlay_alert = true;
	}
	/*else{
		norm_alert = false;
	}*/
	//Trim areas of the curve where cursors were input
	if (!brush.empty()){
		lowslice = getNearestIndex(brush.extent()[0],rx[0]);
		highslice = getNearestIndex(brush.extent()[1],rx[0]);
		if (highslice == -1)
			highslice = rx[0].length-1;
		brushextent = brush.extent();
		//if (d3.event.sourceEvent) brushevent=this;
		document.getElementById("low_cursor").value = rx[0][lowslice].toPrecision(3);
		document.getElementById("high_cursor").value = rx[0][highslice].toPrecision(3);
		//document.getElementById("debugout1").innerHTML = "";
		for (var i=0; i<rx.length; i++){
			if (predicts[i]==0){
				lowslice = getNearestIndex(brush.extent()[0],rx[i]);
				highslice = getNearestIndex(brush.extent()[1],rx[i]);
				//Normalize curve if checked
				if (norm_checkbox.checked || normex_checkbox.checked){ //&& predicts[i]==0){ //
					//document.getElementById("debugout1").innerHTML += i + " ";
					//if (i==96)alert("aaaa");
					if (ry[i][lowslice] != ry[i][highslice]){

                        if(norm_checkbox.checked){
						    var ret = normalizeBaseline(rx[i],ry[i],rx[i][lowslice],rx[i][highslice]);
                            if (fileOption.value == "Absorbance"){
                                ret.y = SavitzkyGolay(ret.y,0.5,9,0,SGOLAY_POLYNOMIAL);
                                ret.y = transformAbsorbance(ret.y); 
                            }
						}else{
                            
                            var ret = normalizeExponential(rx[i],ry[i],rx[i][lowslice],rx[i][highslice]);
                            ret.y =  NormalizeNow(ret.y,100);
                            if (fileOption.value == "Absorbance"){
                                ret.y = SavitzkyGolay(ret.y,0.5,9,0,SGOLAY_POLYNOMIAL);
                                ret.y = transformAbsorbance(ret.y);
                            }
                        }

                        mx[i] = ret['x'];
						my[i] = ret['y'];
						for (var j=0; j<my[i].length; j++){
							//TODO: remove curve from list if normalization fails
							if (my[i][j] > NORM_FAIL_UPPER || my[i][j] < NORM_FAIL_LOWER){
								my[i] = 0;
								mx[i] = 0;
								break;
							}
						}
					}else{
						my[i] = [0]*my[i].length;
						mx[i] = rx[i].slice(lowslice,highslice);
					}
				}else{
					mx[i] = rx[i].slice(lowslice,highslice);
					my[i] = ry[i].slice(lowslice,highslice);
				}
			}else{
				mx[i] = rx[i].slice();
				my[i] = ry[i].slice();
			}
		}
	}else{
		//need to deep copy so raw curve doesn't get modified
		for (var i=0; i<rx.length; i++){
			mx[i] = rx[i].slice();
			my[i] = ry[i].slice();
		}
	}
	if (overlay_checkbox.checked && !brush.empty()){
		//document.getElementById("legend_header").className="";
		average_overlay();
	}
	if (document.getElementById("derivative_checkbox").checked){
		for (var i=0; i<mx.length; i++){
			//Smoothing data makes parts of the curve less fuzzy
			var ret = smoothData(mx[i],my[i],calculateSmoothSize(mx[i]));
			mx[i] = ret['x'];
			my[i] = ret['y'];
			//my[i]=negDerivative(my[i],mx[i]);
			if (my[i]!=0){
				my[i]=sgDerivative(my[i],mx[i]);
				mx[i]=mx[i].slice(0,mx[i].length-1);
			}
		}
	}

        var graphYmin = 0;
		if (document.getElementById("difference_checkbox").checked){
            var newys = [];
            for (var i=0; i<mx.length-1; i++){
			    //Smoothing data makes parts of the curve less fuzzy
			    var ret = smoothData(mx[i],my[i],calculateSmoothSize(mx[i]));
			    mx[i] = ret['x'];
			    my[i] = ret['y'];
                
                    for (var x=0; x<mx[0].length; x++){
                                    
                        if(i==0){
                            if(!isNaN(newys[x])){
                                newys.push(Number(my[i][x]));
                            }else{
                                    newys.push(Number(0));
                            }
                        }else{
                            if(!isNaN(newys[x])){
                            newys[x] += Number(my[i][x]);
                            }else{
                            newys[x] += 0;
                            }
                        }
                    }

                
            }
            
           for (var y=0; y<newys.length; y++){
                newys[y] = newys[y]/(mx.length);
                
            }
        newys = NormalizeNow(newys,100);
        
            var ref = getReferenceCurve();
                if(ref > -1){
                var newys = my[ref];
                }else{}

		for (var i=0; i<mx.length; i++){
			//Smoothing data makes parts of the curve less fuzzy
			var ret = smoothData(mx[i],my[i],calculateSmoothSize(mx[i]));
			mx[i] = ret['x'];
			my[i] = ret['y'];
           
            
			//my[i]=negDerivative(my[i],mx[i]);
			if (my[i]!=0){ 
				for (var x=0; x<my[0].length; x++){
                    my[i][x]=my[i][x]-newys[x]; 
                }
				mx[i]=mx[i].slice(0,mx[i].length-1);
                
			}
            var numbers = my[i];    
            minY = Math.min.apply(null, numbers);
            if (minY < graphYmin){graphYmin=minY};
		}
       
	}
	
   if (document.getElementById("difference_checkbox").checked){
            minY = graphYmin;
        }else{
            minY = 0;
        }

	
	display_graph(mx,my,MOD_OUT_DIV);
	if (document.getElementById("derivative_checkbox").checked){
		ytext_mod.attr("x", helicity_derivitave_label_align_x)
			.text("-d(Helicity)/d(Temp)");
	}else if ( (normex_checkbox.checked || norm_checkbox.checked) && !brush.empty()){
		ytext_mod.attr("x", helicity_label_align_x)
			.text("Helicity (%)");
	}
    if (document.getElementById("difference_checkbox").checked){
		ytext_mod.attr("x", helicity_derivitave_label_align_x)
			.text("Î” Helicity %");
	}
    
	updateLegend();
}

function NormalizeNow(numbers, value)
{ 
    
    var l = numbers.length;
    var i = 0;

var mini = Math.min.apply(null, numbers);
for (i = 0; i < l; i++) {
    numbers[i] = numbers[i]-mini;
}

var ratio = numbers[0];
for (i = 0; i < l; i++) {
    numbers[i] = 100*(numbers[i] / ratio);
}


return numbers;
}

//Data is smoothed based on density of array.
function calculateSmoothSize(x){
	var minTicks = 0; //minimum number of ticks before a full degree in temperature
	var currentTicks=0,currentTemp,prevTemp = Math.floor(x[0]); //current whole number temperature
	for (var i=0; i<x.length; i++){
		currentTemp = Math.floor(x[i]);
		if (currentTemp > prevTemp){
			if (minTicks == 0){
				minTicks = 9999; //a high number
			}else if (minTicks > currentTicks){
				minTicks = currentTicks;
			}
			currentTicks=0;
			prevTemp = currentTemp;
		}
		currentTicks+=1;
	}
	if (minTicks == 9999 || minTicks == 0) return 1;
	return Math.floor(minTicks / SMOOTH_SIZE) +1;
}
function smoothData(x,y,smoothSize){
	//TODO: check if the length of x and y are equal
	var smoothx=[], smoothy=[], retx=[], rety=[];
	var ret={};
	for (var i=0; i<x.length; i++){
		if (i % smoothSize == 0 && i!=0){
			retx.push(smoothx.reduce(function(a,b){return a+b;})/smoothSize);
			rety.push(smoothy.reduce(function(a,b){return a+b;})/smoothSize);
			smoothx=[];
			smoothy=[];
		}
		smoothx.push(x[i]);
		smoothy.push(y[i]);
	}
	ret['x']=retx;
	ret['y']=rety;
	return ret;
}
function dataToString(){
	var length=0, maxlen=0, templen;
	var names=[], xs=[],ys=[],name;
	
	for (var i=0; i<mx.length; i++){
		if (includes[i]==1){
			//check if fname has a , in it
			names.push(curve_names[i]+" Temperature");
			names.push(curve_names[i]+" Fluorescence");
			xs.push(mx[i]);
			ys.push(my[i]);
			length+=1;
			templen = mx[i].length;
			if (templen > maxlen){
				maxlen = templen;
			}
			templen = my[i].length;
			if (templen > maxlen){
				maxlen = templen;
			}
		}
	}
	var fulltext="";
	for (var i=0; i<length*2; i++){
		fulltext += names[i];
		if (i!=length*2-1){
			fulltext += ",";
		}
	}
	fulltext+="\n"
	//alert(xs[0][0].length);
	for (var i=0; i<maxlen; i++){
		for (var j=0; j<length; j++){
			if (xs[j].length > i){
				if (j!=0){
					fulltext+=",";
				}
				fulltext += xs[j][i] + "," + ys[j][i];
			}
		}
		fulltext+="\n";
	}
	return fulltext;
}
function saveCurves(){
	var text = dataToString();
	var filename = document.getElementById("filename_input").value;
	//Put a UI element for filename?
	saveAs(
		  new Blob(
			  [text]
			, {type: "text/plain;charset=" + document.characterSet}
		)
		, filename
	);
}
/*
function exportStr(s){
	var uri = "data:text/csv;charset=utf8," + encodeURIComponent(s);
	var fname = "data.csv";
	var link = document.createElement("a");
	if (link.download !== undefined){
		link.setAttribute("href",uri);
		link.setAttribute("download",fname);
	}else if (navigator.msSaveBlob){
		link.addEventListener("click", function(event){
			var blob = new Blob([s], { "type": "text/csv;charset=utf-8;" });
		}, false);
	}else{
		alert("cannot export client side");
	}
	link.innerHTML = "Export to CSV";
	document.body.appendChild(link);
}
*/
/*	if (document.getElementById("overlay_checkbox").checked){
		average_overlay();
	}
	if (document.getElementById("derivative_checkbox").checked){*/
function get_curve_details(index){
	var datax = mx[index];
	var datay = my[index];
	var retstr="";
	retstr += "Name: " + curve_names[i];
	retstr += "<br>From file: " + curve_fnames[i];
	if (document.getElementById("normalize_checkbox").checked){
		//how do I get Tm? save them? do if there is only normalization?
		retstr += "<br>Tm: " + strip(tm_from_curve(datax,datay));
	}
	//only if derivative and normalize is selected
	if (document.getElementById("normalize_checkbox").checked && 
	document.getElementById("derivative_checkbox").checked){
		retstr += "<br>Curve Area: " + strip(derivative_curve_area(datax,datay))
	}
	//get 2D offset if applicable?
	//retstr += "<br>2D Offset: " + ???;
}

function tm_from_curve(datax,datay){
	for (var i=0; i<datay.length; i++){
		if (datay[i]>=50) return (datax[i]+datax[i-1])/2;
	}
	return 0;
}

function derivative_curve_area(datax,datay){
	//get points per degree
	var points_per_degree = xdata_pre.length / (xdata_pre[xdata_pre.length-1] - xdata_pre[0]);
	//get sum of datay
	var sum=0;
	for (var i=0; i<datay.length; i++){
		sum+=datay[i];
	}
	return sum / points_per_degree;
}


//Saved offset coordinates to draw lines showing area
//var offset_coordinates = {predicted:[],interpolated:[]};
function calculate_2d_offset(xdata_exp, ydata_exp, xdata_pre, ydata_pre){
	//note: xdata = temperature, ydata = fluoresence
	
	var offsets = [];
	var pre_count = 0, exp_count = 0;
	//document.getElementById("debugout2").innerHTML = "xdata_pre: " + xdata_pre;
	//while there are still points to look through
	while (pre_count < ydata_pre.length && exp_count < ydata_exp.length-1){
		if (xdata_exp[exp_count] < xdata_pre[pre_count]){
			if (xdata_pre[pre_count] <= xdata_exp[exp_count+1]){
				/*var offset,dtemp;
				dtemp = ((xdata_exp[exp_count+1] - xdata_exp[exp_count]) * (ydata_pre[pre_count]-ydata_exp[exp_count]))/(ydata_exp[exp_count+1] - ydata_exp[exp_count]);
				offset = Math.abs(dtemp + xdata_exp[exp_count] - xdata_pre[pre_count]);
				*/
				var y_int = ydata_exp[exp_count] + (ydata_exp[exp_count+1] - ydata_exp[exp_count]) *
					((xdata_pre[pre_count] - xdata_exp[exp_count])/(xdata_exp[exp_count+1] - xdata_exp[exp_count]));
				var offset = Math.abs(ydata_pre[pre_count] - y_int);
				//offset_coordinates["predicted"].push({x:xdata_pre[pre_count],y:ydata_pre[pre_count]});
				//offset_coordinates["interpolated"].push({x:xdata_pre[pre_count],y:y_int});
				offsets.push(offset);
				pre_count++;
			}else{
				exp_count++;
			}
		}else{
			pre_count++;
		}
	}
	
	//document.getElementById("debugout3").innerHTML = "offsets: " + offsets;
	//document.getElementById("debugout4").innerHTML = "count pred: " + pre_count + ", count exp: " + exp_count;
	var offset_sum=0.0;
	//consideration: throw out small enough numbers so window size doesn't change offset number outside of normalization differences
	for (var i=0; i<offsets.length; i++){
		//if (offsets[i] > OFFSET_CUTOFF){
			offset_sum += offsets[i];
		//}
	}
	var points_per_degree = xdata_pre.length / (xdata_pre[xdata_pre.length-1] - xdata_pre[0]);
	//return offset_sum;
	return strip(offset_sum / points_per_degree);
}

function getAverageCurve(xs,ys){
	var x_data=[], y_data=[];var means = [];var sum,count; 
	for (var i=0; i<my[0].length; i++){
		    
			sum=0;
			count=0;
		if (includes[i]==1 && my[i]!=0){
			for (var j=0; j<mx.length; j++){
					//x_data[i].push(mx[i][j]);

                    try {

					//y_data[i].push(my[i][j]);
                    //alert(my[i]);
					var yval = my[j][i]; 
                    //alert(yval);
                    if (!isNaN(yval) && yval != null && typeof(yval) != "undefined"){
                        
                        count += 1.0;
					    sum += Number(yval)*1.0;
                        	
                    }else{}

                    }catch (e) {
                          console.log("Ignoring: " + e);
                        }
			}
            var tavg = sum/count;

            //alert("Index:"+i+" - "+tavg);
			means.push(tavg); 
            }else{

			means.push(null);
		}
	}
   

    
	return means;
}






var overlay_low = 0.05;
var overlay_high = 0.15;

//Changes modified curves to overlay to reference curve
function average_overlay(){
	//overlay_type = typeof overlay_type !== 'undefined' ? overlay_type : OVERLAY_TO_EXP;
	var x_data=[], y_data=[], x_avgs=[], y_avgs=[];
	var mean_of_exp = 0;
	var mean_of_ref = 0; 
	var mean_count_exp = 0;
	var mean_of_means = 0;
	var means = [];
	var sum,count;
	//var haspredicted = false;
	var ref = getReferenceCurve();
	if (ref == -1) return;
	//var debug1 = "";
	for (var i=0; i<mx.length; i++){
		x_data.push([]);
		y_data.push([]);
		if (includes[i]==1 && my[i]!=0){
			sum=0;
			count=0;
			//if (predicts[i] == 1){
			//	haspredicted = true;
			//}
			for (var j=0; j<mx[i].length; j++){
				if (my[i][j] > overlay_low * 100.0 && my[i][j] < overlay_high * 100.0){
					sum+=mx[i][j];
					count++;
					x_data[i].push(mx[i][j]);
					y_data[i].push(my[i][j]);
				}
			}
			//debug1+=sum + ", ";
			if (count==0)
				means.push(null);
			else
				means.push(sum/(count*1.0));
		}else{
			//debug1+="null, ";
			means.push(null);
		}
	}
	//if (!haspredicted){
		//TODO: figure out what to do with no predicted curve
		//alert("No predicted curve to overlay");
	//	return;
	//}
	/*
	for (var i=0; i<means.length; i++){
		if (means[i]!=null){
			if (predicts[i] == 1){
				mean_of_pred += means[i];
				mean_count_pred++;
			}else{
				mean_of_exp += means[i];
				mean_count_exp++;
			}
		}
	}	
	if (mean_count_pred == 0 || mean_count_exp == 0){
		//Alert?
		//alert("This message should only appear if there's only predicted curves");
		return;
	}*/
	for (var i=0; i<means.length; i++){
		if (means[i]!=null){
			if (i == ref){
				mean_of_ref = means[i];
			}else{
				mean_of_exp += means[i];
				mean_count_exp++;
			}
		}
	}
	mean_of_means = (mean_of_ref + mean_of_exp) / (1 + mean_count_exp);
	//mean_of_pred = mean_of_pred / mean_count_pred;
	mean_of_exp = mean_of_exp / mean_count_exp;
	//document.getElementById("debugout2").innerHTML = "Means (array): " + means;
	//var predicted_index;
	//var experimental_index;
	for (var i=0; i<mx.length; i++){
		//Don't modify if:
		//	It's not visible (null)
		//	It's a predicted curve and overlay is predicted
		//	It's not a predicted curve and overlay is experimental
		//if (includes[i] == 1 && predicts[i] == overlay_type){
			//predicted_index = i;
			//This if statement assumes 0 and 1 with overlay type
			//A lot fewer statements to modify only the correct curves for overlay
		//if (i!=ref && means[i]!=null){
		if (means[i]!=null){
			for (var j=0; j<mx[i].length; j++){
				mx[i][j] +=  mean_of_exp - means[i];
			}
		}
		//}else if (includes[i] == 1){
		//	experimental_index = i;
		//}
	}
	//document.getElementById("debugout1").innerHTML = debug1;
	//document.getElementById("debugout2").innerHTML = "<br>" + mean_of_exp;
	//var offset = calculate_2d_offset(mx[experimental_index], my[experimental_index], 
	//		mx[predicted_index], my[predicted_index]);
	
	//document.getElementById("calculated_offset_out").innerHTML = offset;
		
}

//Overlay function must be done after normalization but before derivitave
/*
var OVERLAY_TO_EXP = 1;
var OVERLAY_TO_PRED = 0;
function sgolay_overlay(overlay_type){
	//Default to predicted
	overlay_type = typeof overlay_type !== 'undefined' ? overlay_type : OVERLAY_TO_PRED;
	//check overlay type? have as parameter?
	var predicted_index = -1;
	var mean_of_exp = 0;
	var mean_of_pred = 0; 
	var mean_count_exp = 0;
	var mean_count_pred = 0;
	var mean_of_means = 0;
	var means = [];
	var haspredicted = false;
	//document.getElementById("debugout2").innerHTML="Polynomials: ";
	//document.getElementById("debugout3").innerHTML="Integrals: ";
	//document.getElementById("debugout4").innerHTML="n's: ";
	for (var i=0; i<mx.length; i++){
		var polynomials;
		if (includes[i] == 1){
			if (predicts[i] == 1)
				haspredicted = true;
				*/
			/*if (predicts[i] == 1){
				if (predicted_index == -1){
					//TODO: figure out what to do with multiple predicted curves in overlay
				}
				predicted_index=i;
			}*/
			/*
			polynomials = sgolay(mx[i],my[i]);
			//document.getElementById("debugout2").innerHTML+=polynomials + "_";
			var integral = 0.0;
			for (var j=0; j<polynomials.length; j++){
				integral+=polynomials[j]*(Math.pow(overlay_high,j+1)/(j+1)-Math.pow(overlay_low,j+1)/(j+1));
			}
			//integral+=p[i]*(Math.pow(xH,i+1)/(i+1)-Math.pow(xL,i+1)/(i+1));
			//document.getElementById("debugout3").innerHTML+=integral + ", ";

			var mean = integral/(overlay_high - overlay_low);
			//if (mean > 0){
			means.push(mean);		
			//}else{
			//	mean=0;
			//	means.push(null);
			//}
		}else{
			means.push(null);
		}
	}
	if (!haspredicted){
		//TODO: figure out what to do with no predicted curve
		//alert("No predicted curve to overlay");
		return;
	}
	//separate means between experimental and predicted
	for (var i=0; i<means.length; i++){
		if (means[i]!=null){
			if (predicts[i] == 1){
				mean_of_pred += means[i];
				mean_count_pred++;
			}else{
				mean_of_exp += means[i];
				mean_count_exp++;
			}
		}
	}
	//document.getElementById("debugout1").innerHTML = "Means: " + means;
	//Don't want to divide by zero!
	if (mean_count_pred == 0 || mean_count_exp == 0){
		//Alert?
		//alert("This message should only appear if there's only predicted curves");
		return;
	}
	mean_of_means = (mean_of_pred + mean_of_exp) / (mean_count_pred + mean_count_exp);
	mean_of_pred = mean_of_pred / mean_count_pred;
	mean_of_exp = mean_of_exp / mean_count_exp;
	//var predicted_mean = means[predicted_index];
	var diff;
	if (overlay_type == OVERLAY_TO_PRED){
		diff = mean_of_pred - mean_of_exp;
		//diff = mean_of_pred;
	}else if (overlay_type == OVERLAY_TO_EXP){
		diff = mean_of_exp - mean_of_pred;
	}
	*/
	/*
		means[j]=(means[j]-TMean);
		var newT = (T_Spread[j][i] - means[j]);
	*/
	//document.getElementById("debugout2").innerHTML += "<br>Difference: " + diff;
	//var diff = mean_of_pred - mean_of_exp;
	//coding for overlay to predicted
	/*
	for (var i=0; i<mx.length; i++){
		//Don't modify if:
		//	It's not visible (null)
		//	It's a predicted curve and overlay is predicted
		//	It's not a predicted curve and overlay is experimental
		if (includes[i] == 1 && predicts[i] == overlay_type){
			//This if statement assumes 0 and 1 with overlay type
			//A lot fewer statements to modify only the correct curves for overlay
			for (var j=0; j<mx[i].length; j++){
				mx[i][j] +=  mean_of_means - means[i];
			}
		}
	}
}
*/
	//TODO: keep track of curves that are predicted
	//take each m curve
	//get a mod value for each
	/*
	
	//portion added for cursoring
	integral=0.0;
	for (i=0;i<DP;i++) {
		integral+=p[i]*(Math.pow(xH,i+1)/(i+1)-Math.pow(xL,i+1)/(i+1));
	}
	
	var mean = integral/(xH-xL);  // divide by interval width to compute mean
	
	return mean;
}



//declare some vars
var means=new Array();
var theMean=0;
var x = new Array();
var y = new Array();
var TMean=0;
var MeanCount=0; 
var ins=new Array();

//loop through each curve (helicity) and push the points that fall between .15 and .05 into the x,y to pass to integral fit function
//H_Spread is the helicity curve data?
//T_spread is the temperature curve data?
for(var j=0;j<H_Spread.length;j++){
	var p=new Array(100);
	var high=.15;
	var low=.05;
	ins=[]; //indicies

	//get x's and y's
	for(var i=0;i<H_Spread[j].length;i++){

		if(H_Spread[j][i] <= high && H_Spread[j][i] >= low){
			if(x.indexOf(T_Spread[j][i])>0){

			}else{

				var nx= H_Spread[j][i];
				var ny= T_Spread[j][i];

				x.push(nx);
				y.push(ny); 
				ins.push(i);
			}
		} 
	}

	var pt=1; //? 
	var lt=1; //?
	ins=ins.sort(16);

	//if there are not enough points, add one more that's closest to either high/low
	while(x.length<3){

		var lc = ins[0]-pt; //subtract the index
		var fc = ins[ins.length-1]+lt; //add the index

		var dLC = Math.abs(H_Spread[j][lc]-.15); //get heliccity of low
		var dFC = Math.abs(H_Spread[j][fc]-.05); //get helicity of high

		//change index depending which one is higher or lower
		if(dLC>dFC){
			x.push(H_Spread[j][fc]);
			y.push(T_Spread[j][fc]);
			lt++;
		}else{
			x.push(H_Spread[j][lc]);
			y.push(T_Spread[j][lc]); 
			pt++;
		}
	}

	//integral width
	var xL=.05;
	var xH=.15;
	var numpts = x.length;
	var degree=2;


	//pass x,y and vars to integral fit function
	var mean = SGfitandintegrate(x,y,numpts,degree,p,xL,xH);
	x=[];
	y=[];
	ins=[];

	if(mean>0){
		TMean+=mean;
		MeanCount++;
		means.push(mean);
	}else{
		mean=0;
	}
}


//once we looped through all visible curves, calc the Tmean
TMean=TMean/MeanCount; 


//subtract the Tmean from each of the means calculated
for(var j=0;j<means.length;j++){
	means[j]=(means[j]-TMean);
}
//subtract our difs from each of the T arrays to get our shifted T values
for(var j:int=0;j<T_Spread.length;j++){ 

	var tray=new Array();
	var hray=new Array();
	for(var i:int=0;i<T_Spread[j].length;i++){
		var newT = (T_Spread[j][i] - means[j]);
		var newH = H_Spread[j][i];

		tray.push(newT);
		hray.push(newH);
	}

}*/

//Variables for Savitsky Golay 
var maxDP=10;
var polynomial_degree = 2; //2 was given, we talked about 3 being ideal?

//returns a list of polynomials (based on polynomial degree(?))
function sgolay(xdata,ydata,low_cursor,high_cursor){
	//Default low and high cursor settings
	low_cursor = typeof low_cursor !== 'undefined' ? low_cursor : overlay_low;
	high_cursor = typeof high_cursor !== 'undefined' ? high_cursor : overlay_high;
	var i=0; 
	var j=0; 
	var k=0;
	var DP = polynomial_degree;
	var x = [];
	var y = [];
	for (i=0; i<xdata.length; i++){
		if (ydata[i] > overlay_low * 100 && ydata[i] < overlay_high * 100){
			x.push(xdata[i]);
			y.push(ydata[i]/100.0);
		}
	}
	var n = x.length;
	//document.getElementById("debugout4").innerHTML += n +", ";
	//var DP= D; //CHANGED BE CAREFUL HERE OG = D+1
    var sumS;
    var sumv;
    var sum;
    var integral=0;
    var v = new Array(maxDP);
    var u = new Array(maxDP);
    var c = new Array(maxDP);
	
    var s = new Array();
    var l = new Array();
    
    var p = new Array(); //this will be returned
	
    for(var m=0;m<maxDP;m++){
		var s_base = new Array(maxDP);
		var l_base = new Array(maxDP);
		s.push(s_base);
		l.push(l_base);
	}
	var finals = new Array();
	// set up normal equations, Su = v, S DPxDP y DPx1
	for (i=0;i<DP;i++){
		for (j=i;j<DP;j++){
			sumS=0;
			for (k=0;k<n;k++) sumS += Math.pow(x[k],i+j);
			s[i][j]= s[j][i] = sumS; 
		}
		sumv = 0.0;
		for (k=0;k<n;k++)  sumv += y[k] * Math.pow(x[k], i);
		v[i] = sumv;
	}
	
	// Perform Cholesky factorization S = LL^T
	for (i=0;i<DP;i++){
		sum=s[i][i];
		
		for (j=0;j<i;j++) {
			sum -= Math.pow(l[i][j],2) ;
		}
		l[i][i] = Math.pow(sum, 0.5);
		for (j=i+1;j<DP;j++) {
			sum=s[j][i];
			for (k=0;k<i;k++) sum -= l[i][k]*l[j][k];
			l[j][i] = sum/l[i][i];
		}
	}
	
	// Solve Lc = v
	for (i=0;i<DP;i++){
		sum = v[i];
		for (j=0;j<i;j++) {
			sum -= l[i][j]*c[j];
		}
		c[i] = sum / l[i][i];
	}
	
	// Solve L^T u = c
	for (i=polynomial_degree;i>=0;i--){
		sum = c[i];
		for (j=i+1;j<DP;j++) sum -= l[j][i]*u[j];
		u[i] = sum / l[i][i];
	}
	// Store polynomials to be returned
	for (i=0;i<DP;i++) {
		p[i]=u[i];
	}
	//document.getElementById("debugout2").innerHTML = p;
	return p;
}
/*
var maxDP=10;
//x: x-axis data
//y: y-axis data (note, x and y may be switched)
//n: length of data
//D: degree of polynomial (quadratic for overlay (3))
//p: polynomials (array of values to return)
//xL: low cursor
//xH: high cursor
function SGfitandintegrate(x,y,n,D,p,xL,xH){
	var i=0; 
	var j=0; 
	var k=0;
	var DP= D; //CHANGED BE CAREFUL HERE OG = D+1
    var sumS;
    var sumv;
    var sum;
    var integral=0;
    var v = new Array(maxDP);
    var u = new Array(maxDP);
    var c = new Array(maxDP);
	      
    var s = new Array();
    var l = new Array();
	
    for(var m=0;m<maxDP;m++){
		var s_base = new Array(maxDP);
		var l_base = new Array(maxDP);
		s.push(s_base);
		l.push(l_base);
	}
	
	var finals = new Array();
	// set up normal equations, Su = v, S DPxDP y DPx1
	for (i=0;i<DP;i++){
		for (j=i;j<DP;j++){
			sumS=0;
			for (k=0;k<n;k++) sumS += Math.pow(x[k],i+j);
			s[i][j]= s[j][i] = sumS; 
		}
		sumv = 0.0;
		for (k=0;k<n;k++)  sumv += y[k] * Math.pow(x[k], i);
		v[i] = sumv;
	}
	
	// Perform Cholesky factorization S = LL^T
	for (i=0;i<DP;i++){
		sum=s[i][i];
		
		for (j=0;j<i;j++) {
			sum -= Math.pow(l[i][j],2) ;
		}
		l[i][i] = Math.pow(sum, 0.5);
		for (j=i+1;j<DP;j++) {
			sum=s[j][i];
			for (k=0;k<i;k++) sum -= l[i][k]*l[j][k];
			l[j][i] = sum/l[i][i];
		}
	}
	
	// Solve Lc = v
	for (i=0;i<DP;i++){
		sum = v[i];
		for (j=0;j<i;j++) {
			sum -= l[i][j]*c[j];
		}
		c[i] = sum / l[i][i];
	}
	
	// Solve L^T u = c
	for (i=D;i>=0;i--){
		sum = c[i];
		for (j=i+1;j<DP;j++) sum -= l[j][i]*u[j];
		u[i] = sum / l[i][i];
	}
	// Store polynomials to be returned
	for (i=0;i<DP;i++) {
		p[i]=u[i];
	}
*/
//html2canvas doesn't work well enough
/*
function screenshotPage(){
	//convert body to csv with html2canvas
	html2canvas(document.body,{
		onrendered: function(canvas){
			document.body.appendChild(canvas);
			//currently 500x360
			//Canvas2Image.saveAsPNG(canvas, SCREENSHOT_X, SCREENSHOT_Y);
		}
	});
	//convert csv to image with canvas2image
	
}
*/

//doesn't work
/*
function screenshotPage(){
	var root = document.documentElement;
	var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'html:canvas');
	var context = canvas.getContext('2d');
	var selection = {
		top: 0,
		left: 0,
		width: root.scrollWidth,
		height: root.scrollHeight,
	};

	canvas.height = selection.height;
	canvas.width = selection.width;

	context.drawWindow(
		window,
		selection.left,
		selection.top,
		selection.width,
		selection.height,
		'rgb(255, 255, 255)'
	);

	Canvas2Image.saveAsPNG(canvas, SCREENSHOT_X, SCREENSHOT_Y);
}
*/
function getNearestIndex(datum,data){
	for (var i=0; i<data.length; i++){
		if (datum<data[i]) return i;
	}
	return -1;
}

//Regular negative derivative (probably not used)
function negDerivative(ydata,xdata){
	var deriv = Array();
	for (var i=1; i<ydata.length; i++){
		deriv.push((ydata[i-1] - ydata[i])/(xdata[i]-xdata[i-1]));
	}
	return deriv;
}

//Savitzky Golay derivative
function sgDerivative(ydata,xdata){
	//need average difference in xdata as equidistant points is an assumption of Savitsky Golay
	var sumdiff=0;
	var nans=0;
	for (var i=1; i<xdata.length; i++){
		if (!isNaN(xdata[i])){
			sumdiff+= xdata[i] - xdata[i-1];
		}else{
			nans++;
		}
	}
	sumdiff/= (xdata.length -1 - nans);
	var yret = SavitzkyGolay(ydata,sumdiff,SGOLAY_WINDOW,1,SGOLAY_POLYNOMIAL);
	for (var i=0; i<yret.length; i++){
		yret[i] *= -1;
	}
	return yret;
}




//Calculate the difference plot values using the average curve as a baseline
function calcDiffPlot(ydata,xdata){

	var yret = [];
    var ref = getReferenceCurve();
    if(ref !=0){
    var avdata = my[ref];
    }else{
	var avdata = getAverageCurve(xdata,ydata);}
   // var ratio = Math.max.apply(Math,ydata) / 100;
    
   // var l = avdata.length;
    //var i=0;
    //for (i = 0; i < l; i++) {
    // ydata[i] = Math.round(ydata[i] / ratio);
    //}


	for (var i=0; i<ydata.length; i++){
		var newval = ydata[i] - avdata[i];
        yret.push(newval);
	}

    //alert(yret);
	return yret;
}

//"rounds" a number to nearest .00
function strip(number) {
	if (number == 0) return 0;
	if (number < 0.001) return "<0.001";
	return (parseFloat(number.toFixed(2)));
}



function truncateIfLong(s){
	if (s.length > MAX_NAME_LEN){
		return s.slice(0,MAX_NAME_LEN - 3) + "...";
	}
	return s;
}


var hidey1 = document.getElementById('seqparams');
var hidey2 = document.getElementById('sequence_input');
var hidey3 = document.getElementById('minusbutton');
hidey1.style.display = 'none';hidey2.style.display = 'none';hidey3.style.display = 'none';

function hideme(){


    var x = document.getElementById('seqparams'); 
    if (x.style.display === 'none') {
        x.style.display = 'block';
    } else {
        x.style.display = 'none';
    }

    var x1 = document.getElementById('sequence_input'); 
    if (x1.style.display === 'none') {
        x1.style.display = 'block';
    } else {
        x1.style.display = 'none';
    }

    var x2 = document.getElementById('minusbutton'); 
    if (x2.style.display === 'none') {
        x2.style.display = 'block';
    } else {
        x2.style.display = 'none';
    }

    var x3 = document.getElementById('plusbutton'); 
    if (x3.style.display === 'none') {
        x3.style.display = 'block';
    } else {
        x3.style.display = 'none';
    }

}
