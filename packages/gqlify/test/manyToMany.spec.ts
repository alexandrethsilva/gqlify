/**
 * ManyToMany is for simple CRUD test
 */
import chai from 'chai';
import chaiHttp = require('chai-http');
chai.use(chaiHttp);
import * as admin from 'firebase-admin';
import { FirebaseDataSource } from '@gqlify/firebase';
import { FirestoreDataSource } from '@gqlify/firestore';
import { MongodbDataSourceGroup } from '@gqlify/mongodb';
import MemoryDataSource from '../src/dataSource/memoryDataSource';
import { sdl, testSuits } from './testsuites/manyToMany';
import { createGqlifyApp, prepareConfig } from './testsuites/utils';

const {serviceAccount, mongoUri} = prepareConfig();

describe('Relation tests on fixtures/manyToMany.graphql on Memory Data Source', function() {
  beforeEach(async () => {
    const {graphqlRequest, close} = createGqlifyApp(sdl, {
      memory: () => new MemoryDataSource(),
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
  });

  after(async () => {
    await (this as any).close();
  });

  testSuits.call(this);
});

describe('Relation tests on fixtures/manyToMany.graphql with Firebase Data Source', function() {
  this.timeout(25000);

  before(async () => {
    const databaseURL = `https://${serviceAccount.project_id}.firebaseio.com`;
    const {graphqlRequest, close} = createGqlifyApp(sdl, {
      memory: args => new FirebaseDataSource({
        config: {
          credential: admin.credential.cert(serviceAccount),
          databaseURL,
        },
        path: args.key,
      }),
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).firebase = admin.app().database();
  });

  afterEach(async () => {
    await (this as any).firebase.ref('/').remove();
  });

  after(async () => {
    await (this as any).close();
    await admin.app().delete();
  });

  testSuits.call(this);
});

describe('Relation tests on fixtures/manyToMany.graphql with Firestore Data Source', function() {
  this.timeout(25000);

  before(async () => {
    const databaseURL = `https://${serviceAccount.project_id}.firebaseio.com`;
    const {graphqlRequest, close} = createGqlifyApp(sdl, {
      memory: args => new FirestoreDataSource({
        config: {
          credential: admin.credential.cert(serviceAccount),
          databaseURL,
        },
        collection: args.key,
      }),
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).firestore = admin.app().firestore();
  });

  afterEach(async () => {
    const collections = await (this as any).firestore.getCollections();
    await Promise.all(collections.map(async collection => {
      const collectionRef = (this as any).firestore.collection(collection.id);
      const querySnapshot = await collectionRef.get();
      const docPaths = [];
      querySnapshot.forEach(documentSnapshot => {
        docPaths.push(documentSnapshot.ref.path);
      });

      await Promise.all(docPaths.map(async docPath => {
        const docRef = (this as any).firestore.doc(docPath);
        await docRef.delete();
      }));
    }));
  });

  after(async () => {
    await (this as any).close();
    await admin.app().delete();
  });

  testSuits.call(this);
});

describe('Tests on fixtures/manyToMany.graphql with MongoDB Data Source', function() {
  this.timeout(20000);

  before(async () => {
    const mongodbDataSourceGroup = new MongodbDataSourceGroup(mongoUri, 'gqlify');
    await mongodbDataSourceGroup.initialize();

    const {graphqlRequest, close} = createGqlifyApp(sdl, {
      memory: args => mongodbDataSourceGroup.getDataSource(args.key),
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).mongodb = (mongodbDataSourceGroup as any).db;
  });

  afterEach(async () => {
    const listCollectionsQuery = await (this as any).mongodb.listCollections();
    const collections = await listCollectionsQuery.toArray();
    await Promise.all(collections.map(async collection => {
      await (this as any).mongodb.collection(collection.name).deleteMany({});
    }));
  });

  after(async () => {
    await (this as any).close();
  });

  testSuits.call(this);
});
