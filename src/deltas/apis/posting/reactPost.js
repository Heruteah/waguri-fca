"use strict";

const utils = require('../../../utils');

/**
 * @module reactPost
 * @description Add or remove reactions (LIKE, LOVE, HAHA, WOW, SAD, ANGRY) to Facebook posts
 * 
 * Credits: Fix by Jaymardev (known as heru)
 * 
 * @param {object} defaultFuncs - Default functions object
 * @param {object} api - API object
 * @param {object} ctx - Context object containing user session data
 * @returns {Function} reactPost function
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Valid reaction types
   */
  const REACTION_TYPES = {
    LIKE: 1,
    LOVE: 2,
    CARE: 16,
    HAHA: 4,
    WOW: 3,
    SAD: 7,
    ANGRY: 8,
    NONE: 0  // Remove reaction
  };

  /**
   * Add or change reaction to a Facebook post
   * 
   * @param {string} postID - The ID of the post to react to
   * @param {string} reactionType - Reaction type: "LIKE", "LOVE", "CARE", "HAHA", "WOW", "SAD", "ANGRY", or "NONE" to remove
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<object>} Result object with success status
   * 
   * @example
   * // Like a post
   * api.reactPost('123456789_987654321', 'LIKE');
   * 
   * // Love a post
   * api.reactPost('123456789_987654321', 'LOVE');
   * 
   * // Remove reaction
   * api.reactPost('123456789_987654321', 'NONE');
   * 
   * // With callback
   * api.reactPost('123456789_987654321', 'HAHA', (err, result) => {
   *   if (err) return console.error(err);
   *   console.log('Reaction added:', result);
   * });
   */
  return async function reactPost(postID, reactionType, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};

    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    callback = callback || function (err, data) {
      if (err) return rejectFunc(err);
      resolveFunc(data);
    };

    // Validate parameters
    if (!postID) {
      const error = new Error('reactPost: Post ID is required');
      utils.error('reactPost', error);
      return callback(error);
    }

    if (!reactionType) {
      const error = new Error('reactPost: Reaction type is required');
      utils.error('reactPost', error);
      return callback(error);
    }

    // Normalize reaction type to uppercase
    const normalizedReaction = reactionType.toUpperCase();

    if (!REACTION_TYPES.hasOwnProperty(normalizedReaction)) {
      const error = new Error(
        `reactPost: Invalid reaction type. Must be one of: ${Object.keys(REACTION_TYPES).join(', ')}`
      );
      utils.error('reactPost', error);
      return callback(error);
    }

    const reactionValue = REACTION_TYPES[normalizedReaction];

    try {
      // GraphQL mutation for adding/changing/removing reaction
      const variables = {
        input: {
          attribution_id_v2: `ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,unexpected,${Date.now()},${Math.floor(Math.random() * 1000000)},${ctx.userID},,`,
          feedback_id: Buffer.from(`feedback:${postID}`).toString('base64'),
          feedback_reaction: reactionValue,
          feedback_source: "PROFILE",
          is_tracking_encrypted: false,
          tracking: [],
          session_id: utils.generateOfflineThreadingID(),
          actor_id: ctx.userID,
          client_mutation_id: utils.generateOfflineThreadingID()
        }
      };

      const form = {
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'CometUFIFeedbackReactMutation',
        variables: JSON.stringify(variables),
        server_timestamps: true,
        doc_id: '5803809346330346'
      };

      utils.log('reactPost', `${reactionValue === 0 ? 'Removing reaction from' : 'Adding ' + normalizedReaction + ' to'} post ${postID}`);

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
        postID: postID,
        reaction: normalizedReaction,
        reactionValue: reactionValue,
        message: reactionValue === 0 
          ? 'Reaction removed successfully' 
          : `Reacted with ${normalizedReaction} successfully`
      };

      utils.log('reactPost', result.message);
      callback(null, result);

    } catch (error) {
      utils.error('reactPost', error);
      callback(error);
    }

    return returnPromise;
  };
};
