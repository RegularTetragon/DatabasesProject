"use strict"
//Used to deconstruct urls into their api target (first capture group) and optionally their single url parameter.
const API_PATTERN = /\/api\/([^\/\s]+)(?:\/([^\/\s]*))?/
//Used to remove everything that's irrelevant to the sql parser as it makes error reporting more coherent.
const SQL_NONENCODING = /[\t]|#.*\n/g
let http = require("http")
let mysql = require("mysql")
const VERBOSE = false



//Some very simple helper functions
//Identity function
let id = (x)=>x;
//First element function
let first = (x)=>x[0]
//Returns the first element if the length is greater than zero, otherwise returns x as is
let maybefirst=(x)=>(x.length > 0)?x[0]:"undefined";
//Only One
function only(x) {
	if (x.length != 1) {
		return x[0]
	}
	else {
		throw "More than one result in array"
	}
}


//Callback doesn't need to handle query failure.
//if the query fails response is written to with failure information, otherwise successfulQueryCallback gets invoked with the output of the query
function connectAndQuery(query, response, successfulQueryCallback) {
	let mysqlconnection = mysql.createConnection(
		{
			host: "vbma223.netlab.uky.edu",
			user: "vbma223",
			password: "4000AngryNewts007",
			database: "project",
			multipleStatements : true
		}
	)
	//Removes all the comments and tabs etc. from the query
	let reducedQuery = query.replace(SQL_NONENCODING, "");
	if (VERBOSE) {
		console.log(reducedQuery)
	}
	mysqlconnection.connect((errorConnection) => {
		if (errorConnection) internalErrorResponse(response, errorConnection);
		else {
			mysqlconnection.query(
				reducedQuery,
				(error, ...params) => {
					if  (error) {
						internalErrorResponse(response, "SQL Error: " + error.sqlMessage)
					}
					else {
						successfulQueryCallback.apply(successfulQueryCallback, params);
					}
				}
			)
		}
	})

}
//JSONifies the object and writes it to the stream, then closes the stream.
function writeObjectToStreamAndClose(response, servercode, object) {
	response.writeHead(servercode, {'Content-Type': 'application/json'});
	if (VERBOSE) {
		console.log(object)
	}
	response.write(JSON.stringify(object));
	response.end();
}
//Unconditionally writes {"status_code":1} to the stream and closes the stream.
function writeSuccessToStreamAndClose(response) {
	writeObjectToStreamAndClose(response, 200, {"status_code":1})
}
//Writes {"success":1} to response if the query is successful, otherwise writes the error to the stream and {"success":0}
//Closes the stream in both cases
function writeQuerySuccessToStreamAndClose(response, query) {
	connectAndQuery(query, response, ()=>writeSuccessToStreamAndClose(response));
}

//Runs query and writes the result to the response.
//Optionally you may provide a pre-processing method. By default "id" is used. Suggestions include "only", and "first"
function writeQueryResultToStreamAndClose (response, query, queryresultPreprocess = id) {
	connectAndQuery(query, response, (queryresult)=>writeObjectToStreamAndClose(response, 200, queryresultPreprocess(queryresult)));
}

//http://www.w3schools.com was used as reference material for many of the sql queries below
//A dictionary mapping paths to functions of the form Stream, Object | undefined, String | Undefined -> () with any side effects. Stream is written to and these functions are responsible for closing the stream. Several types of errors may be thrown
//The input string is the content from the given request.
let requesthandlers = {
	"status" : writeSuccessToStreamAndClose,
	"teapot" : function(response) {
		writeObjectToStreamAndClose(response, 418, {"i-am-a-teapot":false,"i-am-a-coffee-machine":false,"i-am-a-server":true});
	},
	//Service API
	"addservice" : function(response, postPayload) {
		let query = `
		INSERT IGNORE INTO location VALUES (UUID(), "${postPayload.address}");
		INSERT IGNORE INTO institution VALUES(UUID(), "${postPayload.taxid}");
		INSERT IGNORE INTO department VALUES(
			"${postPayload.department_id}",
			(SELECT id FROM institution WHERE tax_id = "${postPayload.taxid}")
		);
		INSERT INTO service VALUES (
			"${postPayload.service_id}",
			(SELECT id FROM location WHERE address = "${postPayload.address}"),
			"${postPayload.department_id}",
			(SELECT id FROM institution WHERE tax_id = "${postPayload.taxid}")
		);
		`
		writeQuerySuccessToStreamAndClose(response, query);
	},
	"getservice" : function(response, _, service_id) {
		let query = `
		SELECT
			S.department_id,
			S.id AS service_id,
			I.tax_id,
			L.address AS location_id
		FROM service S
		INNER JOIN institution I ON S.institution_id = I.id
		INNER JOIN location L ON S.location_id = L.id
		WHERE S.id = "${service_id}";
		`
		writeQueryResultToStreamAndClose(response, query, maybefirst);
	},
	//TODO: Pick Option A or B for cleaning
	"removeservice" : function(response, _, service_id) {
		let query = `DELETE FROM service WHERE id = "${service_id}"`
		writeQuerySuccessToStreamAndClose(response, query);
	},
	//Provider API
	"listlocations" : function(response) {
		let query = "SELECT id, address FROM location;";
		writeQueryResultToStreamAndClose(response, query);
	},
	"getlocation" : function(response, _, urlparam) {
		let query = `SELECT address, lid FROM location WHERE address = ${urlparam};`;
		writeQueryResultToStreamAndClose(response, query);
	},
	"addlocation" : function(response, postPayload) {
		if (postPayload["address"]) {
			let query = `
				INSERT INTO location (id, address) VALUES (UUID(), "${postPayload.address}");
				SELECT address, id FROM project WHERE address = ${postPayload.address});
			`;
			writeQuerySuccessToStreamAndClose(response, query);
		}
		else {
			malformedRequestResponse(response, 'JSON field required: address (string)');
		}
	}
}

function malformedRequestResponse(response, error) {
	writeObjectToStreamAndClose(response, 400, {status_code : 0, error : JSON.stringify(error)});
	console.trace();
	console.error(error);
}

function internalErrorResponse(response, error) {
	writeObjectToStreamAndClose(response, 500, {status_code : 0, error : JSON.stringify(error)});
	console.trace()
	console.error(error);
}

function notImplementedResponse(response, url) {
	writeObjectToStreamAndClose(response, 404, {'error' : url + " has not been implemented on this server."});
	console.trace()
	console.error(url + " has not been implemented on this server.");
}

//This function assumes that path is guaranteed to be defined in requestHandlers
function handleRequest(path, response, postPayloadString, urlparam) {
	let postPayload = undefined;
	if (postPayloadString) {
		try {
			postPayload = JSON.parse(postPayloadString);
		}
		catch (e) {
			malformedRequestResponse(response, "JSON object failed to parse, error: " + e)
		}
	}
	if (!postPayloadString || postPayload) {
		requesthandlers[path](response, postPayload, urlparam);
	}
}

function httpListener(request, response) {
	if (VERBOSE) {
		console.log("Request received: ", request.url);
	}
	let url = request.url;
	let matches = url.match(API_PATTERN);

	if (matches) {
		let [match, api, urlparam] = matches;
	
		if (match && requesthandlers[api]) {
			let requestContent = "";
			request.on('data', (str) => requestContent += str);
			try {
				request.on('end', () => handleRequest(api, response, requestContent, urlparam));
			}
			catch (e) {
				internalErrorResponse(response, e);
			}
		}
		else {
			notImplementedResponse(response, url);
		}
	}
	else {
		notImplementedResponse(response, url);
	}
}
http.createServer(httpListener).listen(9998)
