"use client";
import {useMemo} from 'react';
import type {Entry} from './demo';
import {inRange,usePeriod} from './period';
import {useRentflowStore} from './store-context';

/** Entries for the entry-date screens (expenses, cashbook): exact dates inside the selected period. */
export function useRangeEntries():Entry[]{
 const {store}=useRentflowStore();
 const {range}=usePeriod();
 return useMemo(()=>(store.rangeEntries??store.entries).filter(e=>inRange(e.date,range)),[store.rangeEntries,store.entries,range]);
}
