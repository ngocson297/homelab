import { afterEach,describe,expect,it,vi } from 'vitest';
import { CollectorPortalError,getCollectorOrders,markCollected,reportFailure } from '@/lib/collector-portal';
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
afterEach(()=>vi.unstubAllGlobals());
describe('collector portal API client',()=>{
  it('loads only non-sensitive list contract with credentials and no cache',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}}));vi.stubGlobal('fetch',fetchMock);await getCollectorOrders('date=2026-08-05&status=COLLECTOR_ASSIGNED');expect(fetchMock.mock.calls[0]?.[0]).not.toContain('phone');expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({credentials:'include',cache:'no-store'});});
  it('sends confirmations without raw subject identifiers',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({}));vi.stubGlobal('fetch',fetchMock);await markCollected('HL-SYNTHETIC',4,true,true,true);const body=String(fetchMock.mock.calls[0]?.[1]?.body);expect(JSON.parse(body)).toEqual({expectedVersion:4,identityConfirmation:{fullNameConfirmed:true,dateOfBirthConfirmed:true},consentConfirmed:true});expect(body).not.toContain('fullName":"');expect(body).not.toContain('dateOfBirth":"');});
  it('does not retry stale failure mutations',async()=>{const fetchMock=vi.fn().mockResolvedValue(json({message:'stale'},409));vi.stubGlobal('fetch',fetchMock);await expect(reportFailure('HL-SYNTHETIC',2,'OTHER','Synthetic operational note')).rejects.toBeInstanceOf(CollectorPortalError);expect(fetchMock).toHaveBeenCalledTimes(1);});
});
