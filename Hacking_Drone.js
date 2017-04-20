var fs = require('fs'),
    util = require('util'),
    sleep = require('sleep'),
    timer = require('timers');
// using include to make gps log file

var arDrone = require('./Hacking_Drone_Module'),
    parrot  = arDrone.createClient();

var gps_origin_file = 'gps.json',
    // define file name
    origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'}),
    log_stdout = process.stdout;
    // gps log file

var isHack = false,
    isTakeOff = false,
    current_degree = 0,
    current_latitude = 0,
    current_longtitude = 0,
    dest_distance = 0,
    dest_degree = 0,
    dest_latitude = 0,
    dest_longtitude = 0,
    angle_Cycle_Between = 0,
    angle_CounterCycle_Between = 0;

parrot.config('general:navdata_options',777060865);
// turn on only gps options

parrot.createRepl();
// PoketMon Drone Start

parrot.setMaxListeners(0);

function getCurrentGPS() {
    parrot.once('navdata', function(navdata) {
        origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'});

        let data_content = util.format(navdata.gps),
            text = data_content.replace(/[\']+/g,'');

        origin_data_file.write(text + '\n');

        let latAndlongData = util.format(navdata.gps),
            latData = latAndlongData.indexOf('latitude'),
            longData = latAndlongData.indexOf('longitude'),
            tmpData = latAndlongData.indexOf('elevation'),
            latString = latAndlongData.substring(latData + 12 , longData - 6),
            longString = latAndlongData.substring(longData + 13 , tmpData - 6);

        current_latitude = latString;
        current_longtitude = longString;

        parrot._currentLat = current_latitude;
        parrot._currentLong = current_longtitude;
    });
}

function getCurrentDegree() {
    parrot.once('navdata',function(navdata) {
        let data = util.format(navdata.magneto),
                degreeStart = data.indexOf('fusionUnwrapped'),
                degreeEnd = data.indexOf('ok'),
                degree = data.substring(degreeStart + 17 , degreeEnd - 6) * 1;

        degree = degree > 360 ? degree - 360 : (degree < 0 ? degree + 360 : degree);

        current_degree = degree;
    });
}

setInterval(function() {
    
    if (isHack) { // 해당 좌료로 이동 시작
        
        isHack = false;
        parrot._hack = false;
        // ---------------- Critical Section Start ---------------- //
        let final_break = false,
            cycleDirection = true;

        while (true) {
            
            console.log("방위각 조정 중 ...");

            getCurrentDegree();

            if (current_degree >= dest_degree) {
                angle_Cycle_Between = 360 - current_degree + dest_degree;
                angle_CounterCycle_Between = current_degree - dest_degree;
                // 목적지 방위각이 더 작을때
            } else {
                angle_Cycle_Between = dest_degree - current_degree;
                angle_CounterCycle_Between = 360 + current_degree - dest_degree;
                // 목적지 방위각이 더 클때
            }

            cycleDirection = angle_Cycle_Between > angle_CounterCycle_Between ? false : true ;

            if (cycleDirection) {
                parrot.clockwise(0.5);
            } else {
                parrot.counterClockwise(0.5);
            }
            
            while (current_degree > dest_degree + 2 || current_degree < dest_degree - 2) {
                getCurrentDegree();
                // sleep.sleep(2);
            }
            console.log("방위각 조정 완료 ...");

            parrot.stop(); // 회전 멈춰랏

            console.log("Parrot Ar Drone 이동 중 ...");
            parrot.front(1); // 이동 ~

            while (current_degree <= dest_degree + 2 && current_degree >= dest_degree - 2) {
                
                getCurrentDegree();
                getCurrentGPS();
                if ( (current_latitude <= dest_latitude + 0.000015 && current_latitude >= dest_latitude - 0.000015) 
                    && 
                    (current_longtitude <= dest_longtitude + 0.000015 && current_longtitude >= dest_longtitude - 0.000015) ) {
                    // 0.00001 도 차이 = 약 1m 차이

                    console.log("Parrot Ar Drone 해당 지점 도착 ...");

                    parrot.stop();
                    parrot.land(); // Follow 로 진행 시 지우자

                    final_break = true;
                    break;
                }
            }

            parrot.stop(); // 가는거 멈춰랏

            if (final_break) {
                break;
            }
            console.log("드론 경로 이탈 ...");
            console.log("방위각 재조정 중 ...");
        }
        // ---------------- Critical Section End ---------------- //
    }
});

setInterval(function(){

	// parrot.once('navdata', function(navdata) {
	// 	origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'});

	// 	let data_content = util.format(navdata.gps),
    //         text = data_content.replace(/[\']+/g,'');

	// 	origin_data_file.write(text + '\n');

	// 	let latAndlongData = util.format(navdata.gps),
    //         latData = latAndlongData.indexOf('latitude'),
    //         longData = latAndlongData.indexOf('longitude'),
    //         tmpData = latAndlongData.indexOf('elevation'),
    //         latString = latAndlongData.substring(latData + 12 , longData - 6),
    //         longString = latAndlongData.substring(longData + 13 , tmpData - 6);

    //     current_latitude = latString;
    //     current_longtitude = longString;

    //     parrot._currentLat = current_latitude;
    //     parrot._currentLong = current_longtitude;
    //     i ++;
    //     // console.log("\n현재 Parrot 위치 : " + current_latitude + " , " + current_longtitude);
	// }); 
	// // get current gps data

	// parrot.once('navdata',function(navdata){
	// 	let data = util.format(navdata.magneto),
    //         degreeStart = data.indexOf('fusionUnwrapped'),
    //         degreeEnd = data.indexOf('ok'),
    //         degree = data.substring(degreeStart + 17 , degreeEnd - 6) * 1;

    //     degree = degree > 360 ? degree - 360 : (degree < 0 ? degree + 360 : degree);

    //     current_degree = degree;
    //     j ++;
    //     // console.log("\n현재 방위각 : " + current_degree);
	// });
	// // get current degree data

    getCurrentGPS();
    getCurrentDegree();

    if (parrot._hack == true && isHack == false) {
        let victim = parrot._hackData;

        dest_distance = victim[0];
        dest_degree = victim[1];

        dest_latitude = parrot._destLat;
        dest_longtitude = parrot._destLong;

        isHack = true;
        // console.log("\n목적지 좌표 : " + dest_latitude + " , " + dest_longtitude + "\n목적지까지 거리 : " + dest_distance + " m\n목적지 방위각 : " + dest_degree);
    }

	// setTimeout(function(){
	// 	parrot.removeListener('navdata',function(){
    //         console.log("AA");
    //     });
	// },1000);
	
},1000);

