import { database } from 'firebase';
import bcrypt from 'bcryptjs';
import InvalidPasswordError from '../errors/InvalidPasswordError';
import InvalidUsernameError from '../errors/InvalidUsernameError';
import UserAlreadyInUseError from '../errors/UserAlreadyInUseError';
import jwt from 'jsonwebtoken';
import config from '../config';
import Joi from 'joi';

class User {
  static get usersRef() {
    return database().ref('users');
  }

  static get authSchema() {
      return Joi.object().keys({
        username: Joi.string().alphanum().min(3).max(30).required(),
        password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
    })
  }

  static findByToken(token) {
    const { secret } = config;
    const { id } = jwt.verify(token, secret);
    return this.usersRef
    .child(id)
    .once('value')
    .then(u => {
      const user = u.val();
      if(!user || !user.tokens || !user.tokens.includes(token)) {
        return Promise.reject();
      }
      return u;
    })
  }

  static uniqueUsername(username) {
    return this.usersRef
    .orderByChild('username')
    .equalTo(username)
    .once('value')
    .then(users => {
      if(users.val()) {
        throw new UserAlreadyInUseError();
      }
    })
  }

  static removeToken(user, token) {
    const { tokens } = user.val();
    return this.usersRef
    .child(user.key)
    .update({
      tokens: tokens.filter(item => item!== token)
    });
  }

  static addToken(user, token) {
    const { tokens } = user.val();
    return this.usersRef
    .child(user.key)
    .update({ tokens: !tokens ? [token] : [...tokens, token] })
  }

  static encryptPassword(password) {
    return bcrypt.genSalt(10).then((salt) => 
      bcrypt.hash(password, salt)
    )
  }

  static findByCredentials({ username, password}) {
    return this.usersRef
      .orderByChild('username')
      .equalTo(username)
      .once('value')
      .then(item => {
        const users = item.val();
        if(!users) {
          throw new InvalidUsernameError();
        }
        const userKey = Object.keys(users)[0];
        const user = users[userKey];
        return bcrypt.compare(password, user.password)
        .then(res => {
          if(!res) {
            throw new InvalidPasswordError();
          }
          return Object.defineProperty({
            val() { return user }}, 'key', { get: () => userKey });
        })
      })
  }

  static async generateToken(id) {
    const { secret } = config;
    return jwt.sign({ id }, secret, { expiresIn: 60 * 60 * 24 * 14 }).toString();
  }
}

  export default User;