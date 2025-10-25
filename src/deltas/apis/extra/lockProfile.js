"use strict";

const utils = require('../../../utils');

/**
 * @module lockProfile
 * @description Lock or unlock Facebook profile to restrict who can see your posts,
 * photos, and other content. When locked, only friends can view your profile content.
 * 
 * Credits: Fix by Jaymardev (known as heru)
 * 
 * @param {object} defaultFuncs - Default functions object
 * @param {object} api - API object
 * @param {object} ctx - Context object containing user session data
 * @returns {Function} lockProfile function
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Toggle Facebook Profile Lock on or off
   * 
   * @param {boolean} enable - true to lock profile, false to unlock
   * @param {string} [userID] - Optional user ID. If not provided, uses current logged-in user
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<object>} Result object with success status
   * 
   * @example
   * // Lock profile for current user
   * api.lockProfile(true);
   * 
   * // Unlock profile
   * api.lockProfile(false);
   * 
   * // Lock specific user's profile
   * api.lockProfile(true, '100012345678');
   * 
   * // With callback
   * api.lockProfile(true, (err, result) => {
   *   if (err) return console.error(err);
   *   console.log('Profile locked:', result);
   * });
   */
  return async function lockProfile(enable, userID, callback) {
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
      const error = new Error('lockProfile: First parameter must be a boolean (true to lock, false to unlock)');
      utils.error('lockProfile', error);
      return callback(error);
    }

    // Use provided userID or default to current user
    const targetUserID = userID || ctx.userID;

    if (!targetUserID) {
      const error = new Error('lockProfile: User ID not found. Please ensure you are logged in.');
      utils.error('lockProfile', error);
      return callback(error);
    }

    try {
      // GraphQL mutation for locking/unlocking profile
      const form = {
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'ProfileCometSetProfileLockMutation',
        variables: JSON.stringify({
          input: {
            is_locked: enable,
            user_id: targetUserID,
            actor_id: ctx.userID,
            client_mutation_id: utils.generateOfflineThreadingID()
          }
        }),
        server_timestamps: true,
        doc_id: '5552698734782825'
      };

      utils.log('lockProfile', `${enable ? 'Locking' : 'Unlocking'} profile for user ${targetUserID}`);

      const response = await defaultFuncs
        .post('https://www.facebook.com/api/graphql/', ctx.jar, form)
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
        locked: enable,
        userID: targetUserID,
        message: `Profile ${enable ? 'locked' : 'unlocked'} successfully`,
        note: enable 
          ? 'Your profile is now locked. Only friends can see your posts and photos.' 
          : 'Your profile is now unlocked. Your privacy settings control who can see your content.'
      };

      utils.log('lockProfile', result.message);
      callback(null, result);

    } catch (error) {
      utils.error('lockProfile', error);
      callback(error);
    }

    return returnPromise;
  };
};
