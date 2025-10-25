"use strict";

const utils = require('../../../utils');

/**
 * @fix by JaymarDev
 * @module profileGuard
 * @description Enable or disable Facebook Profile Picture Guard to protect profile pictures
 * from being downloaded, shared, or misused by others.
 * 
 * @param {object} defaultFuncs - Default functions object
 * @param {object} api - API object
 * @param {object} ctx - Context object containing user session data
 * @returns {Function} profileGuard function
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Toggle Facebook Profile Picture Guard on or off
   * 
   * @param {boolean} enable - true to enable guard, false to disable
   * @param {string} [userID] - Optional user ID. If not provided, uses current logged-in user
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<object>} Result object with success status
   * 
   * @example
   * // Enable profile picture guard for current user
   * api.profileGuard(true);
   * 
   * // Disable profile picture guard
   * api.profileGuard(false);
   * 
   * // Enable for specific user ID
   * api.profileGuard(true, '100012345678');
   * 
   * // With callback
   * api.profileGuard(true, (err, result) => {
   *   if (err) return console.error(err);
   *   console.log('Guard enabled:', result);
   * });
   */
  return async function profileGuard(enable, userID, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};

    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    // Handle optional parameters
    if (utils.getType(userID) === "Function" || utils.getType(userID) === "AsyncFunction") {
      callback = userID;
      userID = null;
    }

    callback = callback || function (err, data) {
      if (err) return rejectFunc(err);
      resolveFunc(data);
    };

    // Validate enable parameter
    if (typeof enable !== 'boolean') {
      const error = new Error('profileGuard: First parameter must be a boolean (true to enable, false to disable)');
      utils.error('profileGuard', error);
      return callback(error);
    }

    // Use provided userID or default to current user
    const targetUserID = userID || ctx.userID;

    if (!targetUserID) {
      const error = new Error('profileGuard: User ID not found. Please ensure you are logged in.');
      utils.error('profileGuard', error);
      return callback(error);
    }

    try {
      // Get access token from cookies
      const cookies = ctx.jar.getCookiesSync('https://www.facebook.com');
      let accessToken = null;

      // Try to find access token in cookies
      for (const cookie of cookies) {
        const cookieStr = cookie.cookieString();
        if (cookieStr.includes('access_token=')) {
          accessToken = cookieStr.split('access_token=')[1].split(';')[0];
          break;
        }
      }

      // If no access token in cookies, we'll use the GraphQL endpoint without OAuth header
      // Facebook's GraphQL API can work with session cookies
      const form = {
        variables: JSON.stringify({
          "0": {
            "is_shielded": enable,
            "actor_id": targetUserID,
            "client_mutation_id": utils.generateOfflineThreadingID()
          }
        }),
        doc_id: "1477043292367183"
      };

      const customHeader = {};
      if (accessToken) {
        customHeader.Authorization = 'OAuth ' + accessToken;
      }

      utils.log('profileGuard', `${enable ? 'Enabling' : 'Disabling'} profile picture guard for user ${targetUserID}`);

      const response = await defaultFuncs
        .post('https://graph.facebook.com/graphql', ctx.jar, form, {}, customHeader)
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (response.error || response.errors) {
        throw new Error(
          response.error 
            ? response.error 
            : JSON.stringify(response.errors)
        );
      }

      const result = {
        success: true,
        enabled: enable,
        userID: targetUserID,
        message: `Profile picture guard ${enable ? 'enabled' : 'disabled'} successfully`
      };

      utils.log('profileGuard', result.message);
      callback(null, result);

    } catch (error) {
      utils.error('profileGuard', error);
      callback(error);
    }

    return returnPromise;
  };
};
