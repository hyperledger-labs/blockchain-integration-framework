/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * index.ts
 */

import { Router, NextFunction, Request, Response } from 'express';
import { TransactionManagement } from '../TransactionManagement';
import { VerifierFactory } from '../../ledger-plugin/VerifierFactory';

const router: Router = Router();
export const transactionManagement: TransactionManagement = new TransactionManagement();
export const verifierFactory: VerifierFactory = new VerifierFactory();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.render('index', { title: 'Express' });
  } catch (err) {
    next(err);
  }
});

// Show Business Logics
router.get('/api/v1/bl/logics/', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Show Business Logics)\n");
  } catch (err) {
    next(err);
  }
});

// Show Specification of Business Logic
router.get('/api/v1/bl/logics/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Show Specification of Business Logic" + ", id=" + req.params.id + ")\n");
  } catch (err) {
    next(err);
  }
});

// Register a Wallet
router.post('/api/v1/bl/wallets/', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Register a Wallet)\n");
  } catch (err) {
    next(err);
  }
});

// Show Wallet List
router.get('/api/v1/bl/wallets/', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Show Wallet List)\n");
  } catch (err) {
    next(err);
  }
});

// Update Existing Wallets
router.put('/api/v1/bl/wallets/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Update Existing Wallets" + ", id=" + req.params.id + ")\n");
  } catch (err) {
    next(err);
  }
});

// Delete a Wallet
router.delete('/api/v1/bl/wallets/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send("Not Implemented (Delete a Wallet" + ", id=" + req.params.id + ")\n");
  } catch (err) {
    next(err);
  }
});

export default router;
