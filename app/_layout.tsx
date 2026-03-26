import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={[styles.icon, { borderColor: color }]}>
      <View style={[styles.iconInner, { backgroundColor: color }]} />
    </View>
  );
}

// Simple SVG-free icon components using View shapes
function TabIcon({ name, color }: { name: string; color: string }) {
  const opacity = { opacity: 1 };
  if (name === 'home') {
    return (
      <View style={[styles.tabIcon]}>
        <View style={[styles.house, { borderBottomColor: color }]} />
        <View style={[styles.houseBase, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'plus') {
    return (
      <View style={styles.tabIcon}>
        <View style={[styles.plusH, { backgroundColor: color }]} />
        <View style={[styles.plusV, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'lightning') {
    return (
      <View style={styles.tabIcon}>
        <View style={[styles.lightningTop, { borderBottomColor: color }]} />
        <View style={[styles.lightningBot, { borderTopColor: color }]} />
      </View>
    );
  }
  if (name === 'mic') {
    return (
      <View style={styles.tabIcon}>
        <View style={[styles.micBody, { backgroundColor: color }]} />
        <View style={[styles.micBase, { borderColor: color }]} />
      </View>
    );
  }
  return <View style={styles.tabIcon} />;
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => <TabIcon name="plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color }) => <TabIcon name="lightning" color={color} />,
        }}
      />
      <Tabs.Screen
        name="speak"
        options={{
          title: 'Speak',
          tabBarIcon: ({ color }) => <TabIcon name="mic" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  iconInner: { flex: 1, margin: 3, borderRadius: 6 },
  tabIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  house: {
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginBottom: 0,
  },
  houseBase: { width: 14, height: 8, borderRadius: 1 },
  plusH: { width: 16, height: 2, borderRadius: 1, position: 'absolute' },
  plusV: { width: 2, height: 16, borderRadius: 1, position: 'absolute' },
  lightningTop: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  lightningBot: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -2,
  },
  micBody: { width: 8, height: 12, borderRadius: 4 },
  micBase: { width: 14, height: 7, borderWidth: 2, borderRadius: 7, marginTop: 1, borderBottomWidth: 0 },
});
