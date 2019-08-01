import { Router } from 'express';
import User from '../schemas/user';
import { auth, validate } from '../middlewares/auth';


class Auth extends Router {
  constructor() {
    super();

    this.post('/login', validate, (req, res) => {
      var { username, password } = req.body;
    
      User.findByCredentials({ username, password }).then(user => {
        return User.generateToken(user.key).then(token => {
          return User.addToken(user, token)
          .then(() => res.json({ token }));
        })
      }).catch((e) => {
        console.log(e);
          res.status(e.status || 500).send(e);
      })
    });
  
    this.post('/logout', auth, (req, res) => {
      const { user, token } = req;
      User.removeToken(user, token).then(() => 
        res.status(200).send()
      ).catch(err => {
        res.status(400).send(err);
      });
    });
    
    this.post('/register', validate, (req, res) => {
      const { username, password } = req.body;
      return User.uniqueUsername(username)
      .then(() => {
        return User.encryptPassword(password)
      })
      .then(hash => 
        User.usersRef.push({ username, password: hash, balance: 0, paidUntil: 0, notifyUser: true })
        .then(() => {
          return res.status(200).send()
        }))
      .catch((e) => {
        console.log(e);
        res.status(400).send(e)
      });
    });
  
    this.get('/me', auth, (req, res) => {
      const { password, tokens , ...userProps } = req.user.val();
      return res.json({ user: userProps });
    });
  
  }

}

module.exports = new Auth();