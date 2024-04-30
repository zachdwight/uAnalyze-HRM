/*


>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
DISCLAIMER
The generation of actual melt data may be covered by U.S. Patent Nos. 7,582,429; 7,803,551; 8,068,992; 8,093,002; 8,296,074; 9,273,346; 
and other U.S. and foreign patents and patent applications owned by the University of Utah Research Foundation and licensed to 
BioFire Defense, LLC. If your PCR instrument is not licensed under these patents, please contact Jill Powlick at BioFire (jill.powlick@biofiredefense.com) 
for sublicensing information.
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

 * This file is subject to the terms and conditions defined http://www.utah.edu/disclaimer/ and may not be used for external and/or commercial purposes without consent.
 *  [2017] dna-utah.org
 *  All Rights Reserved.

 */

function normalizeBaseline(x, y, leftCursorTemp, rightCursorTemp) {
    var normCurve = {},
        i;

    var leftIndex = findCursorIndex(x, leftCursorTemp), rightIndex = findCursorIndex(x, rightCursorTemp);

    normCurve['x'] = x.slice(leftIndex, rightIndex);
    normCurve['y'] = y.slice(leftIndex, rightIndex);


    var leftFit = fitAtCursor(x, y, leftCursorTemp), rightFit = fitAtCursor(x, y, rightCursorTemp);
	var leftFitLine = generateFitLine(normCurve.x, leftFit), rightFitLine = generateFitLine(normCurve.x, rightFit);

    for (i in normCurve.y) {
        normCurve.y[i] = (100 * (normCurve.y[i] - rightFitLine.y[i]) / (leftFitLine.y[i] - rightFitLine.y[i]));
        
    } 

    return normCurve;
}

function generateFitLine(x, fit) {
    var fitLine = {x:x, y:[]},
    	i;

    for (i in x) {
        fitLine.y.push(x[i] * fit.slope + fit.intercept);       
    }
    return(fitLine);
}

function fitAtCursor(x, y, cursorTemp) {
    var i, j, k, fit, n = x.length, bestRR = 0, bestFit;
    var cursorIndex = findCursorIndex(x, cursorTemp);
    var N = Math.min(n - cursorIndex, cursorIndex + 1);

    for (i = 0; i < N; i++) {
        j = cursorIndex - i;
        k = cursorIndex + i + 1;
        //console.log(j, k);
        //console.log(x.slice(j,k));
        fit = linearRegression(x.slice(j,k), y.slice(j,k));
        if (fit.rr > 0.9997)
            return(fit);
        if (fit.rr > bestRR) {
            bestRR = fit.rr;
            bestFit = fit;
        }
    }
    return(bestFit);
}

function findCursorIndex(x, cursorTemp) {
    var cursorIndex,
        minDiff = 100,
        currentDiff,
        i;

    for (i in x) {
        currentDiff = Math.abs(x[i] - cursorTemp);
        if (currentDiff < minDiff) {
            minDiff = currentDiff;
            cursorIndex = i;
        }
    }
    return(parseInt(cursorIndex));
}

function linearRegression(x, y) {
    var fit = {},
    	sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0,
    	n = y.length,
        i;
    
    for (i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i]*y[i];
        sumXX += x[i]*x[i];
        sumYY += y[i]*y[i];
    }
    
    fit['slope'] = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    fit['intercept'] = (sumY - fit.slope * sumX) / n;
    fit['rr'] = Math.pow((n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)),2);
    
    return fit;
}

function FitCurveSlope(T1,T2,tT,tH){
    var j=0;
    var k=T1;
    var n=T2;
    var Tsum=0;
    var Fsum=0;
    var TTsum=0;
    var TFsum=0;
    
    for (j=k;j<n;j++){

        Tsum += tT[j];
        Fsum += tH[j];
        TTsum += tT[j]*tT[j];
        TFsum += tT[j]*tH[j];

    }

     
    
    
    return (TFsum-Tsum*Fsum/(T2-T1)) / (TTsum-Tsum*Tsum/(T2-T1));
}


function returnA(T_L,m_L,T_H,m_H){
    var a=0;
    var C=0;
    a=(Math.log(-m_H)-Math.log(-m_L))/(T_H-T_L);
    return a;
          }     
           
function returnC(T_L,m_L,T_H,m_H){
    var a=0;
    var C=0;
               
    a=(Math.log(-m_H)-Math.log(-m_L))/(T_H-T_L);
    C=m_L/a;
               
    return C;
}

function normalizeExponential(x, y, leftCursorTemp, rightCursorTemp) {
    var normCurve = {},
        i;

    var leftIndex = findCursorIndex(x, leftCursorTemp), rightIndex = findCursorIndex(x, rightCursorTemp);
    
    var CW=Math.round(y.length*0.02);
    normCurve['x'] = x.slice((leftIndex-CW), (rightIndex+CW));
    normCurve['y'] = y.slice((leftIndex-CW), (rightIndex+CW));

    var H = normCurve.y; var T = normCurve.x; 
    var T_L = leftCursorTemp;//Math.floor(Math.min(T)) + 4;
    var T_R = rightCursorTemp;
    

    var TH = T_L;
    var TL = T_R;
    
   
    var startL = leftIndex-CW;
    var endL = leftIndex+CW;
    var startR=rightIndex-CW;
    var endR=rightIndex+CW;
    
    //if(startL<0){startL=0;}
   //if(endR>H.length){endR=H.length-1;}  
    var leftFit = fitAtCursor(x, y, leftCursorTemp);
    var m_H = leftFit.slope;
    var rightFit = fitAtCursor(x, y, rightCursorTemp);
    var m_L = rightFit.slope;
    


    //var tempH = sgSmooth(H,T);
    //var m_L=FitCurveSlope(startR,endR,T,tempH);
    //var m_H= FitCurveSlope(startL,endL,T,tempH);
   
    
    i=0;
    if(isNaN(m_L)){m_L=-0.05;}
    if(isNaN(m_H)){m_H=-0.05;}
    var a=returnA(TL,m_L,TH,m_H);
    var C=returnC(TL,m_L,TH,m_H);

    
    
    for (i in normCurve.y) {
        var tdif = T[i]-TL;
        
        normCurve.y[i] = H[i]-(C*Math.pow(Math.E,(a* tdif))) ;
        
    } 
    
    return normCurve;
}


function sgSmooth(ydata,xdata){
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
	var yret = SavitzkyGolay(ydata,sumdiff,SGOLAY_WINDOW,0,SGOLAY_POLYNOMIAL);

	return yret;
}

