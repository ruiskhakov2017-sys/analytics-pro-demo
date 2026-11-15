import test from 'node:test';
import assert from 'node:assert/strict';
import {accounts,totals,filterAccounts} from '../src/data.js';
test('demo totals match fixed dataset',()=>{assert.deepEqual(totals(accounts),{spend:16400,revenue:27120,profit:10720,roi:65});});
test('period and empty totals are consistent',()=>{assert.equal(totals(accounts,.25).profit,2680);assert.equal(totals([]).roi,0);});
test('search and status compose',()=>{assert.equal(filterAccounts('atlas','Готов').length,1);assert.equal(filterAccounts('atlas','Проверка').length,0);assert.equal(filterAccounts('<script>').length,0);});
