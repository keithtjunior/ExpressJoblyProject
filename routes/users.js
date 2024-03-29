"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { 
  ensureLoggedIn, 
  ensureCorrectUser, 
  ensureIsAuthorized, 
  ensureIsAdmin } = require("../middleware/auth");
const { BadRequestError, NotFoundError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureLoggedIn, ensureIsAdmin, async function (req, res, next) {
  try {
    debugger;
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureLoggedIn, ensureIsAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: admin, user w/ username
 **/

router.get("/:username", ensureLoggedIn, ensureIsAuthorized, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: admin, user w/ username
 **/

router.patch("/:username", ensureLoggedIn, ensureIsAuthorized, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin, user w/ username
 **/

router.delete("/:username", ensureLoggedIn, ensureIsAuthorized, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});

/** POST /[username]/jobs/[id]  => { username, id }
 * 
 *  Allows a user, or admin on behalf of a user, to apply for a job
 *  a user-id / job-id relationship is created on the applications db.
 * 
 *  Returns { applied: id }
 *  
 *  Authorization required: admin or user w/ username
 **/

router.post("/:username/jobs/:id", ensureLoggedIn, ensureIsAuthorized,  
  async function (req, res, next) {
  try {
    const {username, id} = req.params;
    const user = await User.apply({username, id});
    
    return res.json({ applied: id });
  } catch (err) {
    console.log(err)
    if(err.code === '23503' && String(err.detail).includes('is not present in table "users"'))
      return next(new BadRequestError('No user with that username'));
    if(err.code === '23503' && String(err.detail).includes('is not present in table "jobs"'))
      return next(new NotFoundError(`No job with that id`));
    if(err.code === '23505' && String(err.detail).includes('already exists'))
      return next(new BadRequestError('Duplicate application'));

    return next(err);
  }
});


module.exports = router;
