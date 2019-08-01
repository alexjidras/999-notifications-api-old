import { Router } from 'express';
import { firestore } from 'firebase';
import { flat } from '../utils';
import { auth } from '../middlewares/auth';

class Subscription extends Router {
  constructor() {
    super({mergeParams: true});

    this.get('/', auth, (req,res) => {
      const { page = 1, limit = 5 } = req.query;
      firestore().collection('User_Sub').where('userId', '==', req.user.key).orderBy('createdAt', 'desc').get()
      .then(result => {
        const subscriptionCount = result.size;
        return Promise.all(
          result.docs.slice((page-1)*limit, page*limit).map(doc => {
            const { subscriptionId } = doc.data();
            return Promise.all([
              firestore().collection('Subscription').doc(subscriptionId).get(),
              Promise.all([
                firestore().collection('Sub_Notif').where('subscriptionId', '==', subscriptionId).where('status', '==', 1).get().then(query => query.size),
                firestore().collection('Sub_Notif').where('subscriptionId', '==', subscriptionId).where('status', '==', 0).get().then(query => query.size)
              ]).then(([ q1, q2 ]) => q1 + q2)
            ]).then(([ sub, notificationCount]) => ({
              id: sub.id,
              ...sub.data(),
              notificationCount
            }))
          })
        ).then(subscriptions => {
          res.json({
            subscriptions,
            subscriptionCount
          })
        })
      })
      .catch(e => {
        console.log(e);
        res.status(500).send();
      })
    });

    this.patch('/:subscriptionId/notify', auth, (req, res) => {
      const { subscriptionId } = req.params;
      const { notifySub } = req.body;
      return firestore().collection('User_Sub').where('userId', '==', req.user.key).where('subscriptionId', '==', subscriptionId).get()
      .then(result => {
        if(!result.size) {
          return Promise.reject();
        }
        return firestore().collection('Subscription').doc(subscriptionId).update({ notifySub }).get()
      })
      .then(sub => {
        res.json({ notifySub: sub.data().notifySub });
      })
      .catch(e => {
        console.error(e);
        res.status(500).send();
      })
    })

    this.patch('/:subscriptionId/status', auth, (req, res) => {
      const { subscriptionId } = req.params;
      const { status } = req.body;
      return firestore().collection('User_Sub').where('userId', '==', req.user.key).where('subscriptionId', '==', subscriptionId).get()
      .then(result => {
        if(!result.size) {
          return Promise.reject();
        }
        return firestore().collection('Subscription').doc(subscriptionId).update({ status }).get()
      })
      .then(sub => {
        res.json({ status: sub.data().status });
      })
      .catch(e => {
        console.error(e);
        res.status(500).send();
      })
    })


    this.get('/list', auth, (req, res) => {
      firestore().collection('User_Sub').where('userId', '==', req.user.key).orderBy('createdAt', 'desc').get()
      .then(result => {
        return Promise.all(result.docs.map(doc => {
          const { subscriptionId } = doc.data();
          return firestore().collection('Subscription').doc(subscriptionId).get().then(doc => {
            const { name } = doc.data();
            return ({
              id: subscriptionId,
              name
            })
          })
        }))
        .then(docs => {
          res.json(docs);
        })
      })
    })

    this.get('/notification', auth, (req, res) => {
      const { page = 1, limit = 5, subId = null, status = 'all' } = req.query;
      return (subId ? firestore().collection('User_Sub').where('userId', '==', req.user.key).where('subscriptionId', '==', subId).get()
      .then(result => {
        if(!result.size) {
          return Promise.reject();
        }
        return result
      })
      : firestore().collection('User_Sub').where('userId', '==', req.user.key).get()
      ).then(result => {
        return Promise.all(
          result.docs.map(doc => {
            const { subscriptionId } = doc.data();
            return status === 'all' ? Promise.all(
              [0, 1].map(val => firestore().collection('Sub_Notif').where('subscriptionId', '==', subscriptionId).where('status', '==', val).get().then(query => query.docs.map(doc => doc.data()))
              )).then(([ q1, q2 ]) => q1.concat(q2))
              : firestore().collection('Sub_Notif').where('subscriptionId', '==', subscriptionId).where('status', '==', status === 'new' ? 0 : 1).get().then(query => query.docs.map(doc => doc.data()))
          })
        ).then(notificationsArr => {
          notificationsArr = flat(notificationsArr);
          const notificationCount = notificationsArr.length;
          return Promise.all(
            notificationsArr.sort((n1, n2) => n2.createdAt - n1.createdAt).slice((page-1)*limit, page*limit)
          .map(notification => {
            const { notificationId, ...props } = notification;
            return firestore().collection('Notification').doc(notificationId).get()
            .then(doc => ({
              id: doc.id,
              ...doc.data(),
              ...props
            }))
          })).then(notifications => {
            res.json({
              notifications,
              notificationCount
            })
          })
        })
        .catch(e => {
          console.log(e);
          res.status(500).send();
        })
      })
    })
  }
}

export default new Subscription();