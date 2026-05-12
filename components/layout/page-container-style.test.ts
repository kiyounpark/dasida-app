import { resolvePageContainerStyle } from './page-container-style';

describe('resolvePageContainerStyle', () => {
  describe('phone (isTablet=false)', () => {
    it('reading: 추가 스타일 없음 (자식 통과)', () => {
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
    it('reading: maxWidth 720, padding 24, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('reading', true)).toEqual({
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 24,
      });
    });

    it('hub: maxWidth 1040, padding 24, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('hub', true)).toEqual({
        width: '100%',
        maxWidth: 1040,
        alignSelf: 'center',
        paddingHorizontal: 24,
      });
    });

    it('split: maxWidth 없음, padding 20, 가운데 정렬 없음', () => {
      expect(resolvePageContainerStyle('split', true)).toEqual({
        paddingHorizontal: 20,
      });
    });
  });
});
