"use strict";

const utils = require("../utils");
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
module.exports = (defaultFuncs, api, ctx) => {
  return (guard, callback = () => {}) => {
    if (utils.getType(guard) !== "Boolean") {
      throw {
        error: "Please pass a boolean as a second argument.",
      };
    }
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
    const uid = ctx.userID;
    const form = {
      av: uid,
      variables: JSON.stringify({
        input: {
          is_shielded: guard ? true : false,
          actor_id: uid,
          client_mutation_id: "1"
        },
        scale: 1
      }),
      doc_id: "1477043292367183",
      fb_api_req_friendly_name: "IsShieldedSetMutation",
      fb_api_caller_class: "IsShieldedSetMutation"
    }

    return defaultFuncs
      .post("https://www.facebook.com/api/graphql", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function(resData) {
        if (resData.err) {
          throw {
            err: resData.err
          };
        }
        return callback();
      })
      .catch(err => {
        utils.error("setProfileGuard", err);
        return callback(err);
      });;
  };
};