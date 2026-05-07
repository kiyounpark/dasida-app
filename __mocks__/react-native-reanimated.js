'use strict';

const React = require('react');
const { View } = require('react-native');

const AnimatedView = React.forwardRef(({ style, children, ...props }, ref) =>
  React.createElement(View, { ref, style, ...props }, children)
);

const Animated = {
  View: AnimatedView,
  Text: View,
  Image: View,
  ScrollView: View,
  createAnimatedComponent: (Component) => Component,
};

const useSharedValue = (initialValue) => {
  const ref = { value: initialValue };
  return ref;
};

const useAnimatedStyle = (worklet) => worklet();

const withTiming = (toValue, _config, callback) => {
  if (callback) callback(true);
  return toValue;
};

const withSpring = (toValue, _config, callback) => {
  if (callback) callback(true);
  return toValue;
};

const useAnimatedRef = () => ({ current: null });

const Easing = {
  bezier: () => (t) => t,
  linear: (t) => t,
  ease: (t) => t,
  in: (easing) => easing,
  out: (easing) => easing,
  inOut: (easing) => easing,
};

module.exports = {
  __esModule: true,
  default: Animated,
  Animated,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useAnimatedRef,
  Easing,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  cancelAnimation: () => {},
  withDelay: (delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: (animation) => animation,
  interpolate: (value, inputRange, outputRange) => outputRange[0],
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  useAnimatedScrollHandler: () => {},
  useAnimatedGestureHandler: () => {},
  useDerivedValue: (worklet) => ({ value: worklet() }),
  useAnimatedReaction: () => {},
  FadeIn: {},
  FadeOut: {},
  Layout: {},
};
