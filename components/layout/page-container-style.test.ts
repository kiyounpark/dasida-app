import { resolvePageContainerStyle } from './page-container-style';

describe('resolvePageContainerStyle', () => {
  describe('phone (isTablet=false)', () => {
    it('reading: 추가 스타일 없음', () => {
      expect(resolvePageContainerStyle('reading', false)).toEqual({});
    });
    it('hub: 추가 스타일 없음', () => {
      expect(resolvePageContainerStyle('hub', false)).toEqual({});
    });
    it('split: 추가 스타일 없음', () => {
      expect(resolvePageContainerStyle('split', false)).toEqual({});
    });
  });

  describe('tablet (isTablet=true)', () => {
    it('reading: maxWidth 720, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('reading', true)).toEqual({
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
      });
    });

    it('hub: maxWidth 1040, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('hub', true)).toEqual({
        width: '100%',
        maxWidth: 1040,
        alignSelf: 'center',
      });
    });

    it('split: 추가 스타일 없음 (전체 너비 사용)', () => {
      expect(resolvePageContainerStyle('split', true)).toEqual({});
    });
  });
});
