import { Text, View, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Stack, useRouter } from 'expo-router';
import { Phone, HelpCircle } from 'lucide-react-native';

import { Button } from '@/components/button';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { palette, spacing, typography } from '@/theme/tokens';

function WhatsAppIcon({ size = 24, color = "black" }: { size?: number, color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </Svg>
  );
}

export default function ExpertHelpRoute() {
  const router = useRouter();

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleWhatsApp = (number: string) => {
    Linking.openURL(`whatsapp://send?phone=${number}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Expert help' }} />
      <PageShell
        eyebrow="Government Support"
        title="MP CM Helpline"
        subtitle="Connect directly with the Madhya Pradesh CM Helpline for agricultural guidance, issue resolution, and schemes."
      >
        <SunriseCard accent="brand" title="Madhya Pradesh CM Helpline">
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Phone color={palette.brand} size={18} />
              <Text style={textStyle}>
                Toll-Free Number: 181
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <WhatsAppIcon color="#25D366" size={18} />
              <Text style={textStyle}>
                WhatsApp: 7552 5555 82 (To check complaint status)
              </Text>
            </View>
             <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <HelpCircle color={palette.brand} size={18} />
              <Text style={textStyle}>
                For specific agriculture technical advice, call the Kisan Call Center (KCC) at 1800-180-1551.
              </Text>
            </View>
          </View>
        </SunriseCard>

        <SunriseCard accent="info" title="Guidance for calling">
          <View style={{ gap: spacing.sm }}>
            <Text style={bulletStyle}>1. Keep your Khasra/Khatauni or Kisan ID ready before calling.</Text>
            <Text style={bulletStyle}>2. Clearly explain your crop details (crop name, stage, and issue).</Text>
            <Text style={bulletStyle}>3. Note down the complaint or reference number provided by the operator.</Text>
            <Text style={bulletStyle}>4. You can also ask about the status of PM Kisan or state agricultural schemes.</Text>
          </View>
        </SunriseCard>

        <View style={{ gap: spacing.sm }}>
          <Button label="Call CM Helpline (181)" onPress={() => handleCall('181')} />
          <Button label="Message on WhatsApp" onPress={() => handleWhatsApp('917552555582')} />
          <Button label="Call Kisan Call Center" variant="soft" onPress={() => handleCall('18001801551')} />
          <Button label="Back" variant="soft" onPress={() => router.back()} />
        </View>
      </PageShell>
    </>
  );
}

const textStyle = {
  flex: 1,
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 14,
  lineHeight: 21,
};

const bulletStyle = {
  ...textStyle,
};
