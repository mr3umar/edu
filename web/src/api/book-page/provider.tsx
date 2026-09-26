import { useEffect, useState } from 'react';
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

export function PageProvider({
  pageNumber,
  isActive,
  children,
}: {
  pageNumber: string,
  isActive: boolean,
  children: React.ReactNode;
}) {
  const [laserZones, setLazerZones] = useState<LaserZone[]>([]);
  const [teacherWritings, setTeacherWritings] = useState<WriteOnTextbookData[]>([]);
  const [boardContent, setBoardContent] = useState<string>(undefined);
  // const [pageParts, setPageParts] = useState<PageParts[]>([]);
  const [pageAnalysis, setPageAnalysis] = useState<PageAnalysisM>(undefined);

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
        // const page = pagesCache[pageNumber]
        const zones = pageAnalysis?.words.filter(w => data.wordsIds.includes(w.id)).map(w => ({
                id: w.id,
                x: w.x,
                y: w.y,
                width: w.width,
                height: w.height,
        })) ?? []
        setLazerZones(zones)
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
        uid: "0"
      }, {})
      .then(res => {
        setPageAnalysis(res.data.item)
      })
      .catch(err => {
        console.error(err)
      })
    }
  }, [isActive]);


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