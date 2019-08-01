import { Router } from 'express';
import User from '../schemas/user';
import { auth } from '../middlewares/auth';


class Usr extends Router {
  constructor() {
    super();

    this.patch('/user/notify', auth, (req, res) => {
        const { user } = req;
        const { notifyUser } = req.body;
        user.ref.update({ notifyUser }).get().then(user => {
            const { notifyUser } = user.val();
            return res.json({ notifyUser });
        })
    });

  }
}

export default new Usr();
