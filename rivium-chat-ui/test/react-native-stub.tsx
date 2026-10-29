/** Minimal react-native stand-in for tests: views render as DOM elements. */
import React from 'react';

const passthrough = (tag: string) =>
  // eslint-disable-next-line react/display-name
  React.forwardRef<any, any>(({ children, onPress, style: _style, ...rest }, ref) =>
    React.createElement(
      tag,
      {
        ref,
        // Like RN touchables: the innermost one handles the tap, not its parents.
        onClick: onPress
          ? (e: any) => {
              e.stopPropagation();
              if (!rest.disabled) onPress(e);
            }
          : undefined,
        ...pick(rest),
      },
      children,
    ),
  );

function pick(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of ['testID', 'accessibilityLabel']) {
    if (props[key] !== undefined) out[key === 'testID' ? 'data-testid' : 'aria-label'] = props[key];
  }
  if (props.disabled) out.disabled = true;
  return out;
}

export const View = passthrough('div');
export const Text = passthrough('span');
export const TouchableOpacity = passthrough('button');
export const Pressable = passthrough('button');
export const ActivityIndicator = passthrough('div');
export const TextInput = React.forwardRef<any, any>(({ value, onChangeText, placeholder, editable }, ref) =>
  React.createElement('input', {
    ref,
    value: value ?? '',
    placeholder,
    disabled: editable === false,
    onChange: (e: any) => onChangeText?.(e.target.value),
  }),
);
export function Modal({ visible, children }: any) {
  return visible ? React.createElement('div', { role: 'dialog' }, children) : null;
}
export function FlatList({ data = [], renderItem, keyExtractor, ListEmptyComponent, ListHeaderComponent, ListFooterComponent }: any) {
  const render = (c: any) => (typeof c === 'function' ? React.createElement(c) : c ?? null);
  return React.createElement(
    'div',
    null,
    render(ListHeaderComponent),
    data.length === 0
      ? render(ListEmptyComponent)
      : data.map((item: any, index: number) =>
          React.createElement(React.Fragment, { key: keyExtractor ? keyExtractor(item, index) : index }, renderItem({ item, index })),
        ),
    render(ListFooterComponent),
  );
}
export const Image = passthrough('img');
export const ScrollView = passthrough('div');
export const StyleSheet = { create: <T,>(s: T) => s, flatten: (s: unknown) => s, hairlineWidth: 1 };
export const Platform = { OS: 'ios', select: (o: any) => o.ios ?? o.default };

class Value {
  constructor(public value: number) {}
  setValue(v: number) { this.value = v; }
  stopAnimation() {}
  interpolate() { return this; }
}
const anim = () => ({ start: (cb?: () => void) => cb?.(), stop: () => {} });
export const Animated = {
  Value,
  View: passthrough('div'),
  Text: passthrough('span'),
  loop: anim,
  sequence: anim,
  timing: anim,
  spring: anim,
  parallel: anim,
  delay: anim,
};

/** The last config given to PanResponder.create, so a test can play gestures. */
export const lastPanResponder: { config: any } = { config: null };
export const PanResponder = {
  create(config: any) {
    lastPanResponder.config = config;
    return { panHandlers: {} };
  },
};
export const Keyboard = { dismiss() {} };
export const Clipboard = { setString() {} };
export const Easing = { linear: (t: number) => t, ease: (t: number) => t, inOut: (f: any) => f, out: (f: any) => f, in: (f: any) => f, bezier: () => (t: number) => t };
export const Dimensions = { get: () => ({ width: 390, height: 844 }) };
export const Linking = { openURL: async () => {} };
export const Alert = { alert() {} };
