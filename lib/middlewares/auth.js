import Joi from 'joi';
import User from '../schemas/user';

const validate = (req, res, next) => {
    Joi.validate(req.body, User.authSchema, (err) => {
        if(err) {
            return res.status(400).send(err);
        }
        next();
    })
};

const auth = (req, res, next) => {
  const { token } = req;
  if(!token) {
    return res.status(401).send();
  }
  return User.findByToken(token).then((user) => {
    req.user = user;
    next();
  }).catch((e) => {
    res.status(401).send(e);
  });
};
 
export { validate, auth };