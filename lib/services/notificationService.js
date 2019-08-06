import webpush from 'web-push';
import smsService from './smsService';
import emailService from './emailService';
import chalk from 'chalk';
import cheerio from 'cheerio';
import request from 'request-promise-native';
import { firestore, database } from 'firebase';
import { deepEqual } from '../utils';
import Ajv from 'ajv';

class NotificationService {
  data = {};
  lastId = null;
  timer = null;
  listener = null;
  $schema = new Ajv()
  
  constructor() {
    this.startService = this.startService.bind(this);
    this.work = this.work.bind(this);
    this.stopService = this.stopService.bind(this);
    this.startService();
  }

  startService() {
    this.attachListener();
    this.timer = setInterval(this.work, 5000);
  }

  setData = (sub) => {
    const { schema } = sub.data();
    this.data[data.key] = this.$schema.compile(schema);
  }

  updateData = (sub) => {
    const { schema } = sub.data();
    this.data[sub.id] = this.$schema.compile(schema);
  }

  deleteData = (sub) => {
    delete this.data[sub.id];
    return;
  }

  get subRef() {
    return firestore().collection('Subscription');
  }

  get notifRef() {
    return firestore().collection('Notification')
  }

  get user_subRef() {
    return firestore().collection('User_Sub')
  }

  get sub_notifRef() {
    return firestore().collection('Sub_Notif')
  }

  get userRef() {
    return database().ref('Users')
  }


  attachListener() {
    this.listener = this.subRef.onSnapshot(ref => {
      ref.docChanges().forEach(change => {
        const { newIndex, oldIndex, doc, type } = change
        if (type === 'added') {
          this.setData(doc)
          // if we want to handle references we would do it here
        } else if (type === 'modified') {
          // remove the old one first
          this.updateData(doc)
        } else if (type === 'removed') {
          this.deleteData(doc)
          // if we want to handle references we need to unsubscribe
          // from old references
        }
      })
    }, (err) => {
      console.log('Failed to attach db listener ...' + err);
      this.stopService();
    })
  }

  detachListener() {
    this.listener();
  }

  stopService() {
    clearInterval(this.timer);
    this.detachListener();
  }

  work() {
    request({
      uri: 'https://999.md/services/lastads/?lang=ro',
      json: true
    }).then(async ads => {
      if(!this.lastIndex) {
        return ads;
      }
      const lastIndex = ads.findIndex(item => item._id === this.lastId);
      return lastIndex !== -1 ? ads.slice(0, lastIndex) : ads;
    }).then(newAds => {
      if(!newAds.length) {
        return;
       }         
       this.lastId = newAds[0]._id;
       return Promise.all(newAds.map(({ _id, title, categories, image }) => 
        request({
          uri: `https://999.md/ro/${_id}`,
          transform: body => cheerio.load(body) 
        }).then(body => ({
            id: _id,
            title,
            image,
            categoryId: categories.category.id,
            subcategoryId: categories.subcategory.id,
            ...extractData(body)
          }))
          .then(extractedAnn => {
            const { id: annId, title, image, description, price } = extractedAnn;
            const payload = JSON.stringify({
              title,
              icon: `https://i.simpalsmedia.com/999.md/BoardImages/160x120/${image}`,
              description,
              price: price[0]
            });
            
            Object.entries(this.data).forEach(async ([subscriptionId, validate]) => {
              if(validate(extractedAnn)) {
                try {
                const [ originalSub, { userId } ] = await Promise.all(
                  this.subRef.doc(subscriptionId).get().then(doc => {
                    const sub = doc.data();
                    if(!sub) {
                      throw new Error('sub not found');
                    }
                    return sub;
                  }),
                  this.user_subRef.where('subscriptionId', '==', subscriptionId).get().then(query => {
                    if(!query.size) {
                      throw new Error('user_sub not found');
                    }
                    return query.docs[0].data()
                  }));

                  const originalUser = await this.userRef.child(userId).once('data').then(doc => doc.val());
                  if(!originalUser) {
                    throw new Error('user not found');
                  }

                  const { status, notifySub, notifyMethod, notifyItemId } = originalSub;
                  const { notifyUser, balance, paidUntil } = originalUser;
                  if(paidUntil < Date.now() || status === 'off') {
                    return;
                  }

                  const [ subNotif, existingNotif ] = await Promise.all(
                    this.sub_notifRef.where('subscriptionId', '==', subscriptionId).where('notificationId', '==', annId).get().then(query => query.docs[0]),
                    this.notifRef.doc(annId).get().then(doc => doc.data())
                  );
                  
                  const newNotif = { title, image, price };
                  
                  //if user already notified
                  if(subNotif) {
                    return;
                  }

                  this.sub_notifRef.add({ notifId: annId, subscriptionId, status: 0 });

                  if(!existingNotif) {
                    //create ann if it doesn't exist
                    this.notifRef.add(newNotif);
                  } else {
                    if(!deepEqual(existingNotif, newNotif)) {
                      //update notif if outdated
                      this.notifRef.doc(annId).set(newNotif);
                    }
                  }

                  if(!notifyUser || !notifySub) {
                    return;
                  }

                  switch(notifyMethod) {
                    case 0: {
                      if(balance < 1) {
                        return;
                      }
                      await database().ref(`phoneNumbers/${notifyItemId}`).once('value')
                      .then(doc => {
                        if(!doc.exists()) {
                          return;
                        }
                        const { number, userId: id } = doc.data();
                        if(userId !== id) {
                          throw new Error('Wrong number ...')
                        }

                        return smsService.sendSms(number, payload).then(() =>
                          this.userRef.child(userId).update({ balance: balance - 1 })
                        )
                      })
                    }
                    case 1: {
                      await database().ref(`emails/${notifyItemId}`).once('value')
                      .then(async doc => {
                        if(!doc.exists()) {
                          return;
                        }
                        const { email, userId: id } = doc.data();
                        if(userId !== id) {
                          throw new Error('Wrong email ...')
                        }

                        return emailService.sendEmail(email, payload);
                      })
                    }
                    case 2: {
                      await database().ref(`workers/${notifyItemId}`).once('value')
                      .then(async doc => {
                        if(!doc.exists()) {
                          return;
                        }
                        const { worker, userId: id } = doc.data();
                        if(userId !== id) {
                          throw new Error('Wrong worker ...')
                        }

                        return webpush.sendNotification(worker, payload);
                      })
                    }
                  }
                }
                catch(e) {
                  console.log(chalk.red(e.toString()));
                }
            }
          });
          })
        )).catch(e => {
          console.errors(e.toString());
        })
    })
  }

  static initialize() {
    return new this;
  }
}

const extractData = ($) => {
  return {
    views: $('.adPage__header__stats__views').next().text(),
    description: $('.adPage__content__description').text(),
    price: $('li:not(.is-negotiable) .adPage__content__price-feature__prices__price__value')
    .map((i, item) => ({
      value: $(item).text(),
      currency: $(item).next().attr('content')
    })).get()
  }
}

export default NotificationService;
