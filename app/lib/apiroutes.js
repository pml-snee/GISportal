/**
 * This module provides the routes for the API.
 */

var express = require('express');
var api = require('./api.js');
var apiAuth = require('./apiauth.js');

var router = express.Router();
var apiRouter = express.Router({
   mergeParams: true
});

module.exports = router;

/**
 * Declares the api route to use the token authentication and apiRouter
 */
router.use('/api/1/:token/', apiAuth.authenticateToken, apiRouter);

/**
 * Refresh the api user's cache file for the provided WMS url. Admins may refresh global cache files or other user's
 *    cache files by specifying a username.
 * Query parameters:
 *    url: WMSurl to refresh
 *    user: usename of the cache file owner or 'global'
 */
apiRouter.get('/refresh_wms_cache', apiAuth.denyGuest, api.refresh_wms_cache);

/**
 * Get all the cache files the user has access to in a JSON string.
 */
apiRouter.get('/get_cache', api.get_cache);

/**
 * Get the important details of each cache file the user has access to without all the layers in a JSON string.
 */
apiRouter.get('/get_cache_list', api.get_cache_list);

/**
 * Handle invalid api requests.
 */
router.get('/api/*', function(req, res) {
   res.status(400).send("Invalid API request");
});