import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignCollector, getCollectors, getEligibleCollectors, unassignCollector, updateCollectorAreas } from '@/lib/collectors';
afterEach(()=>vi.unstubAllGlobals());
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
describe('collector admin API client',()=>{
  it('loads paginated collectors with credentials and no cache',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}}));vi.stubGlobal('fetch',fetchMock);await getCollectors('page=1&operationalStatus=AVAILABLE');expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({credentials:'include',cache:'no-store'});});
  it('sends normalized service area contract only',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({}));vi.stubGlobal('fetch',fetchMock);await updateCollectorAreas('COL-001',[{province:'Đà Nẵng',district:null}]);expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({serviceAreas:[{province:'Đà Nẵng',district:null}]});});
  it('loads eligible collectors and sends expectedVersion on assignment',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({data:[]}));vi.stubGlobal('fetch',fetchMock);await getEligibleCollectors('HL-TEST','collector');expect(String(fetchMock.mock.calls[0]?.[0])).toContain('eligible-collectors?search=collector');fetchMock.mockResolvedValueOnce(json({}));await assignCollector('HL-TEST',3,'COL-001');expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({expectedVersion:3,collectorEmployeeCode:'COL-001'});});
  it('does not retry stale unassignment',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({},409));vi.stubGlobal('fetch',fetchMock);await expect(unassignCollector('HL-TEST',2,'Synthetic reason')).rejects.toMatchObject({status:409});expect(fetchMock).toHaveBeenCalledTimes(1);});
});
