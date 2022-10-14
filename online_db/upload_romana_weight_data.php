<?php

    $_REQUEST = (array)$_POST + (array)$_GET + (array)$_REQUEST;
	$dbServername = "177.221.140.106";
	$dbUsername = "mslepecl";
	$dbPassword = "y#jSd9YS9V0#9e";
	$dbName = "mslepecl_other";
	$conn = mysqli_connect($dbServername, $dbUsername, $dbPassword, $dbName);
	$acentos = $conn->query("SET NAMES 'utf8'");

	function sanitize($input) {
        global $conn;
        $input = trim($input);
        $input = stripslashes($input);
        $input = mysqli_real_escape_string($conn, $input);
        $input = htmlspecialchars($input);
        return $input;
    }

    $response = array();
	$response['success'] = False;

    try {

        $input = json_decode(file_get_contents('php://input'));

        $weight_id = ((array) $input)['id'];
        $weight_id = sanitize($weight_id);

        $now = ((array) $input)['now'];
        $now = sanitize($now);

        $user = ((array) $input)['user'];
        $user = sanitize($user);

        $primary_plates = ((array) $input)['primary_plates'];
        $primary_plates = sanitize($primary_plates);

        $process = ((array) $input)['process'];
        $process = sanitize($process);

        $weight_value = ((array) $input)['weight_value'];
        $weight_value = sanitize($weight_value);

        $serial_value = ((array) $input)['serial_value'];
        $serial_value = sanitize($serial_value);

        mysqli_query($conn, "
        	INSERT INTO romana (weight_id, date, user, primary_plates, process, weight_value, serial_data) 
        	VALUES (
        		$weight_id,
        		'$now',
        		$user,
        		'$primary_plates',
        		'$process',
        		$weight_value,
        		'$serial_value'
        	);
        ");

        $response['success'] = True;

        /*
        $response['weight_id'] = $weight_id;
        $response['now'] = $now;
        $response['user'] = $user;
        $response['primary_plates'] = $primary_plates;
        $response['process'] = $process;
        $response['weight_value'] = $weight_value;
        $response['serial_value'] = $serial_value;
        $response['query'] = "INSERT INTO romana (weight_id, date, user, primary_plates, process, weight_value, serial_data) VALUES ($weight_id, '$now', $user, '$primary_plates', '$process', $weight_value, '$serial_value');";
        $response['test'] = "123456";
        */

    }
    catch(Exception $e) { $response['error'] = $e; }
    finally { echo json_encode($response); }
?>