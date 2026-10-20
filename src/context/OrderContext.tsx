'use client';

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { DUMMY_REKOMENDASI, DUMMY_TARGET } from '@/lib/dummy';
import type { OrderAction, OrderState } from '@/lib/types';

// TODO(sesi 2): kosongkan rekomendasi/menuTerpilih dan nilai target dummy —
// isinya akan datang dari planner + solver + ranker.
export const initialState: OrderState = {
  mode: 'hitung',
  bodyData: null,

  tujuan: 'high_protein',
  targetKcal: DUMMY_TARGET.targetKcal,
  minProteinG: DUMMY_TARGET.minProteinG,
  tidakSuka: [],
  preferensiRasa: null,
  budget: DUMMY_TARGET.budget,
  bentuk: null,

  rekomendasi: DUMMY_REKOMENDASI,
  menuTerpilih: DUMMY_REKOMENDASI[0],
  toppingTambahan: {},

  waktuAmbil: 'Secepatnya (~15–20 mnt)',
  kodePesanan: null,
};

function reducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_BODY_DATA':
      return { ...state, bodyData: action.bodyData };
    case 'SET_TUJUAN':
      return { ...state, tujuan: action.tujuan };
    case 'SET_TARGET_KCAL':
      return { ...state, targetKcal: action.value };
    case 'SET_MIN_PROTEIN':
      return { ...state, minProteinG: action.value };
    case 'TOGGLE_TIDAK_SUKA': {
      const tag = action.tag.trim().toLowerCase();
      if (!tag) return state;
      const has = state.tidakSuka.includes(tag);
      return {
        ...state,
        tidakSuka: has ? state.tidakSuka.filter((t) => t !== tag) : [...state.tidakSuka, tag],
      };
    }
    case 'SET_RASA':
      return { ...state, preferensiRasa: action.rasa };
    case 'SET_BUDGET':
      return { ...state, budget: action.value };
    case 'SET_BENTUK':
      return { ...state, bentuk: action.bentuk };
    case 'SET_REKOMENDASI':
      return {
        ...state,
        rekomendasi: action.rekomendasi,
        menuTerpilih: action.rekomendasi[0] ?? null,
        toppingTambahan: {},
      };
    case 'PILIH_MENU':
      return { ...state, menuTerpilih: action.menu, toppingTambahan: {} };
    case 'SET_TOPPING':
      return {
        ...state,
        toppingTambahan: { ...state.toppingTambahan, [action.ingredientId]: action.units },
      };
    case 'RESET_TOPPING':
      return { ...state, toppingTambahan: {} };
    case 'SET_WAKTU_AMBIL':
      return { ...state, waktuAmbil: action.value };
    case 'SET_KODE_PESANAN':
      return { ...state, kodePesanan: action.kode };
    case 'RESET':
      return initialState;
  }
}

type OrderContextValue = { state: OrderState; dispatch: Dispatch<OrderAction> };

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder harus dipakai di dalam <OrderProvider>');
  return ctx;
}
