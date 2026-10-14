import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

const modules = [
  {
    eyebrow: 'MOBILE & WEB',
    title: 'Ký gửi trực tuyến',
    description: 'Ứng dụng iOS và Android dành cho khách hàng theo dõi sản phẩm, giao dịch và thông báo.',
  },
  {
    eyebrow: 'CATALOG',
    title: 'Xem sản phẩm',
    description: 'Khách chưa đăng nhập vẫn có thể xem danh sách, hình ảnh và giá bán của sản phẩm.',
  },
  {
    eyebrow: 'CONSIGNOR',
    title: 'Theo dõi ký gửi',
    description: 'Người ký gửi có thể đặt lịch, theo dõi vòng đời sản phẩm và tra cứu thông tin quyết toán.',
  },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.container}>
          <View style={[styles.hero, isWide && styles.heroWide]}>
            <View style={styles.heroContent}>
              <Text style={styles.kicker}>OLD CLOTHES STORE</Text>
              <Text style={[styles.heading, isWide && styles.headingWide]}>
                Một nền tảng cho ký gửi, vận hành và bán hàng.
              </Text>
              <Text style={styles.lead}>
                OCS dùng React Native và React Native Web cho ứng dụng khách hàng, giao tiếp trực tuyến với Backend API.
              </Text>
            </View>

            <View style={styles.statusPanel}>
              <Text style={styles.statusLabel}>CUSTOMER CLIENT</Text>
              <View style={styles.statusRow}>
                <View style={[styles.dot, styles.dotReady]} />
                <Text style={styles.statusValue}>Mobile · Web · Online</Text>
              </View>
              <Text style={styles.statusHint}>
                Quản lý cửa hàng và POS được triển khai riêng bằng WPF trên Windows.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nền móng đã sẵn sàng</Text>
            <Text style={styles.sectionMeta}>Expo SDK 57 · React Native 0.86 · React Native Web</Text>
          </View>

          <View style={styles.cardGrid}>
            {modules.map((module) => (
              <View key={module.eyebrow} style={[styles.card, isWide && styles.cardWide]}>
                <Text style={styles.cardEyebrow}>{module.eyebrow}</Text>
                <Text style={styles.cardTitle}>{module.title}</Text>
                <Text style={styles.cardDescription}>{module.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  container: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: 32,
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 28,
    padding: 28,
    gap: 28,
  },
  heroWide: {
    minHeight: 380,
    padding: 48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroContent: {
    maxWidth: 660,
    gap: 16,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  heading: {
    color: colors.paper,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  headingWide: {
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2,
  },
  lead: {
    maxWidth: 580,
    color: colors.mutedOnDark,
    fontSize: 17,
    lineHeight: 27,
  },
  statusPanel: {
    minWidth: 280,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.borderOnDark,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  statusLabel: {
    color: colors.mutedOnDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  statusRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotReady: {
    backgroundColor: colors.success,
  },
  statusValue: {
    flex: 1,
    color: colors.paper,
    fontSize: 14,
    fontWeight: '700',
  },
  statusHint: {
    color: colors.mutedOnDark,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 14,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '100%',
    minHeight: 190,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 24,
    gap: 12,
  },
  cardWide: {
    flex: 1,
    minWidth: 280,
  },
  cardEyebrow: {
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
});
