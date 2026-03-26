import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Strand, STRAND_META, STRAND_ORDER } from '../constants/strands';

const SCREEN_W = Dimensions.get('window').width;

const CHART_CONFIG = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: () => 'rgba(0,0,0,0)',
};

interface Props {
  percentages: Record<string, number>;
}

export function StrandRing({ percentages }: Props) {
  const size = Math.min(SCREEN_W - 80, 180);
  const hasData = STRAND_ORDER.some((s) => (percentages[s] || 0) > 0);

  // PieChart requires positive values; when no data show equal phantom slices
  // in gray so the donut still appears (overridden by the emptyRing fallback)
  const pieData = STRAND_ORDER.map((strand) => ({
    name: STRAND_META[strand].label,
    percentage: hasData ? Math.max(percentages[strand] || 0, 0) : 25,
    color: hasData ? STRAND_META[strand].color : '#eee',
    legendFontColor: '#333',
    legendFontSize: 13,
  }));

  // Hole sits on top of the pie chart to create the donut appearance
  const holeSize = size * 0.44;
  const holeOffset = (size - holeSize) / 2;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <PieChart
          data={pieData}
          width={size}
          height={size}
          chartConfig={CHART_CONFIG}
          accessor="percentage"
          backgroundColor="transparent"
          paddingLeft="0"
          hasLegend={false}
          absolute={false}
        />
        {/* White overlay creates the donut hole */}
        <View
          style={[
            styles.hole,
            {
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
              top: holeOffset,
              left: holeOffset,
            },
          ]}
        />
      </View>

      <View style={styles.legend}>
        {STRAND_ORDER.map((strand) => (
          <View key={strand} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: STRAND_META[strand].color }]} />
            <Text style={styles.legendLabel}>
              {STRAND_META[strand].label}{' '}
              <Text style={styles.legendPct}>
                {Math.round(percentages[strand] || 0)}%
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 20,
  },
  chartWrapper: {
    position: 'relative',
  },
  hole: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  legend: { flexShrink: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 13, color: '#333' },
  legendPct: { fontSize: 13, fontWeight: '600', color: '#111' },
});
