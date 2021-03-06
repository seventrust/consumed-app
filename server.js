/**
 * D2LValence package, js api.
 *
 * Copyright (c) 2012 Desire2Learn Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the license at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var D2L = require('./valence.js'),
	express = require('express'),
	request = require('superagent');

var app = express(),
	appId = process.env.APP_ID || 'ww7pg9CJ-Ej2qo8RzOTWwQ',
	appKey = process.env.APP_KEY || '9diO7y6-bdAMDOCNljwJFyzKUG4cRw',
	appContext = new D2L.ApplicationContext('http://201.214.139.56', appId, appKey);

app
	.get(
		'/auth',
		getLmsData,
		function (req, res/*, next*/) {
			var callbackTarget = 'http://201.214.139.56',
				getTokensUrl = appContext
					.createUrlForAuthentication(req.lms.scheme + '//' + req.lms.host, req.lms.port, callbackTarget);

			res
				.status(303)
				.set('Location', getTokensUrl)
				.end();
		})

	.all(
		'/call',
		getLmsData,
		function (req, res/*, next*/) {
			var authCallbackSearch = req.param('auth'),
				userContext = appContext
					.createUserContext(req.lms.scheme + '//' + req.lms.host, req.lms.port, authCallbackSearch);

			if (!userContext.userId || !userContext.userKey) {
				var userId = req.param('userId'),
					userKey = req.param('userKey');

				userContext = appContext
					.createUserContextWithValues(req.lms.scheme + '//' + req.lms.host, req.lms.port, userId, userKey);
			}

			var path = req.param('path'),
				method = req.method.toLowerCase();

			var apiCallUrl = userContext.createAuthenticatedUrl(path, method),
				apiCall = request[method === 'delete' ? 'del' : method](apiCallUrl);

			if (['post', 'put'].indexOf(method) !== -1) {
				apiCall.type('application/json');
				req.pipe(apiCall);
			}

			apiCall.end(function (err, apiRes) {
				if (err) {
					res
						.status(500)
						.end();
					console.error(err);
					return;
				}

				res
					.status(apiRes.status)
					.set('Content-Type', apiRes.headers['content-type'])
					.end(apiRes.text);
			});
		}
	)

	.use('/', express.static(__dirname + '/public'))
	.use('/superagent', express.static(__dirname + '/node_modules/superagent'));

function getLmsData (req, res, next) {
	req.lms = {
		host: req.param('host'),
		port: req.param('port'),
		scheme: req.param('scheme') ? 'https:' : 'http:'
	};

	next();
}

console.log(
	'Open your browser to http://localhost:%d',
	require('http').createServer(app).listen(8080).address().port
);
