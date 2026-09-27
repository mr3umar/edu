import { useEffect, useMemo, useState } from 'react';
import type { PageAnalysisM } from '../../domain';
import { useTutor } from '../tutor/hook';
import { onLaserZonesUpdated, onTeacherWritingsUpdated, setCurrentPageNumber, type WriteOnTextbookData } from '../books';
import { PageContext } from './context';
import { getPageAnalysis } from '../rest/services/books';

export type LaserZone = {x: number; y: number; width: number; height: number}
export type PageParts = {id: string; type: string; coordinates: {
  "min_x": number,
  "min_y": number,
  "max_x": number,
  "max_y": number
}}

// The same words, in any order.
function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(id => set.has(id))
}

export function PageProvider({
  pageNumber,
  pageUid,
  analysisRevision,
  isActive,
  children,
}: {
  pageNumber: string,
  // The page's uid, which its analysis is looked up by.
  pageUid: string,
  // Changes when the page's analysis has been redone, to fetch it again.
  analysisRevision: number,
  isActive: boolean,
  children: React.ReactNode;
}) {
  // The words the tutor is pointing at (from the audio's wordsIds). Their
  // boxes come from the page's analysis, worked out below whenever either
  // changes: the analysis loads after the page becomes active, so a handler
  // that looked the words up itself would only ever see it missing.
  const [laserWordIds, setLaserWordIds] = useState<string[]>([]);
  const [teacherWritings, setTeacherWritings] = useState<WriteOnTextbookData[]>([]);
  const [boardContent, setBoardContent] = useState<string>(undefined);
  // const [pageParts, setPageParts] = useState<PageParts[]>([]);
  const [pageAnalysis, setPageAnalysis] = useState<PageAnalysisM>(undefined);

  const laserZones = useMemo<LaserZone[]>(() => {
    if (!pageAnalysis || laserWordIds.length === 0) return []
    // Mostly words, but it can point at a part of the page too (a question, a
    // picture...), by the part's id.
    const words = pageAnalysis.words
      .filter(word => laserWordIds.includes(word.id))
      .map(word => ({ x: word.x, y: word.y, width: word.width, height: word.height }))
    const parts = pageAnalysis.parts
      .filter(part => part.coordinates && laserWordIds.includes(part.id))
      .map(part => ({ ...part.coordinates }))
    return [...words, ...parts]
  }, [pageAnalysis, laserWordIds]);

  const  { setIsBoardOpen } = useTutor()


  useEffect(() => {
    load();

    // setLazerZones([{
    //   x: 10,
    //   y: 20,
    //   width: 40,
    //   height:5
    // }])
  }, []);

  useEffect(() => {
    if(isActive){
      void setCurrentPageNumber(pageNumber)

      onLaserZonesUpdated(pageNumber, (data) => {
        // Each audio chunk of a stream repeats its words; pointing at the same
        // ones again changes nothing (a new list would replay the laser).
        const next = data.wordsIds ?? []
        setLaserWordIds(current => sameIds(current, next) ? current : next)
      })
      onTeacherWritingsUpdated(pageNumber, (writings) => {
        console.log(`teaching writing updated`)
        // setTeacherWritings([...writings])
        // updated to just show the last drawing:
        setTeacherWritings([writings[writings.length-1]])
      })
      // onBoardContentUpdated(pageNumber, (content) => {
      //   console.log(`board content`)
      //   setBoardContent(content)
      //   setIsBoardOpen(true)
      // })

      getPageAnalysis({
        uid: pageUid
      }, {})
      .then(res => {
        // Errors come back as { error }, not exceptions. NotFound: the page
        // hasn't been analysed (yet), so it just shows without laser zones.
        const item = res.data?.item
        if (res.error || !item) {
          if (res.error && res.error.code !== 'NotFound') {
            console.warn(`[page ${pageNumber}] couldn't load its analysis:`, res.error.code, res.error.description)
          }
          return
        }
        console.log(item)
        setPageAnalysis(item)
      })
      .catch(err => {
        console.error(err)
      })
    }
  }, [isActive, pageUid, analysisRevision]);


  async function load() {

    // if(isActive) {

    //   onLaserZonesUpdated(pageNumber, (zones) => {
    //     setLazerZones(zones)
    //     setTimeout(() => {
    //       setLazerZones([])
    //     }, 500 * zones.length + 3000)
    //   })
    // }
    // setLoading(true);

    try {
      // const page = await getPage(pageNumber)
    } finally {
      // setLoading(false);
    }
  }



  // setTimeout(() => {
  //   setLazerZones([...laserZones, {x: laserZones.length+1, y: 5}])
  // }, 1000)


  return (
    <PageContext.Provider
      value={{
        laserZones,
        teacherWritings,
        boardContent,
        pageAnalysis
      }}
    >
      {children}
    </PageContext.Provider>
  );
}