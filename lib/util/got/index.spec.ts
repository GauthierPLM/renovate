import nock from 'nock';
import { getName } from '../../../test/util';
import {
  PLATFORM_TYPE_GITEA,
  PLATFORM_TYPE_GITHUB,
  PLATFORM_TYPE_GITLAB,
} from '../../constants/platforms';
import * as hostRules from '../host-rules';
import { GotJSONOptions } from './common';
import { api } from '.';

const baseUrl = 'https://api.github.com';

describe(getName(__filename), () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    hostRules.clear();
    nock.enableNetConnect();
  });

  async function got(opts?: Partial<GotJSONOptions>) {
    const { body, request } = (await api('some', {
      method: 'GET',
      baseUrl,
      json: true,
      ...opts,
    })) as any;
    return { body, options: request.gotOptions };
  }

  function mock(opts?: nock.Options, times = 1) {
    return nock(baseUrl, opts).get('/some').times(times).reply(200, {});
  }

  it('uses  bearer auth', async () => {
    const req = mock({ reqheaders: { authorization: 'Bearer XXX' } }, 2);
    hostRules.add({ baseUrl, token: 'XXX' });

    expect(await got()).toMatchSnapshot();
    expect(await got({ token: 'XXX' })).toMatchSnapshot();
    expect(req.isDone()).toBe(true);
  });

  it('uses  basic auth', async () => {
    const req = mock({ reqheaders: { authorization: 'Basic OnRlc3Q=' } }, 2);

    hostRules.add({ password: 'test', timeout: 60000 });

    expect(await got()).toMatchSnapshot();
    expect(await got({ auth: ':test' })).toMatchSnapshot();
    expect(req.isDone()).toBe(true);
  });

  it('uses token auth', async () => {
    const req = mock({ reqheaders: { authorization: 'token XXX' } });
    hostRules.add({ baseUrl, token: 'XXX' });
    expect(await got({ hostType: PLATFORM_TYPE_GITEA })).toMatchSnapshot();
    expect(req.isDone()).toBe(true);
  });

  it('uses private-token auth', async () => {
    const req = mock({ reqheaders: { 'private-token': 'XXX' } });
    hostRules.add({ baseUrl, token: 'XXX' });
    expect(await got({ hostType: PLATFORM_TYPE_GITLAB })).toMatchSnapshot();
    expect(req.isDone()).toBe(true);
  });

  it('gets', async () => {
    const req = mock({})
      .head('/some')
      .reply(200, {})
      .get('/some')
      .replyWithError('not-found');

    expect(
      await got({
        hostType: PLATFORM_TYPE_GITHUB,
        useCache: false,
      })
    ).toMatchSnapshot();

    expect(
      await got({ hostType: PLATFORM_TYPE_GITHUB, method: 'HEAD' })
    ).toMatchSnapshot();

    await expect(got({ hostType: PLATFORM_TYPE_GITHUB })).rejects.toThrow(
      'not-found'
    );

    expect(req.isDone()).toBe(true);
  });
});
