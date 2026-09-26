
import { createContext } from 'react';

type PageContextType = {
  laserZones: LaserZone[];
  teacherWritings: WriteOnTextbookData[];
  boardContent: string
  pageAnalysis: PageAnalysisM
};

export const PageContext =
  createContext<PageContextType | null>(null);

import type { LaserZone, PageParts } from './provider';
import type { WriteOnTextbookData } from '../books';import type { PageAnalysisM } from '../../domain';

