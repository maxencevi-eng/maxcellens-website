import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl, serviceKey } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_ORDER_HOME = ['home_intro', 'home_services', 'home_portrait', 'home_cadreur', 'home_stats', 'clients', 'home_quote', 'home_cta'];
const DEFAULT_ORDER_CONTACT = ['contact_intro', 'contact_zones', 'contact_kit'];
const DEFAULT_ORDER_ANIMATION = ['animation_s1', 'animation_s2', 'animation_s3', 'animation_cta'];
const DEFAULT_ORDER_REALISATION = ['production_intro', 'production_videos'];
const DEFAULT_ORDER_EVENEMENT = ['evenement_intro', 'evenement_videos'];
const DEFAULT_ORDER_CORPORATE = ['corporate_intro', 'corporate_videos'];
const DEFAULT_ORDER_PORTRAIT = ['portrait_intro', 'portrait_gallery'];
const DEFAULT_ORDER_GALERIES = ['galeries_menu'];

function parseOrder(val: unknown, defaultOrder: string[]): string[] {
  if (!val || typeof val !== 'string') return defaultOrder;
  try {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return defaultOrder;
    const ids = parsed.filter((id: unknown) => typeof id === 'string');
    return ids.length ? ids : defaultOrder;
  } catch {
    return defaultOrder;
  }
}

/** GET : retourne blocs masqués + modes de largeur + ordre des blocs par page (public). */
export async function GET() {
  try {
    if (!supabaseAdmin || !supabaseUrl || !serviceKey) {
      return NextResponse.json({
        hiddenBlocks: [],
        blockWidthModes: {},
        blockOrderHome: DEFAULT_ORDER_HOME,
        blockOrderContact: DEFAULT_ORDER_CONTACT,
        blockOrderAnimation: DEFAULT_ORDER_ANIMATION,
        blockOrderRealisation: DEFAULT_ORDER_REALISATION,
        blockOrderEvenement: DEFAULT_ORDER_EVENEMENT,
        blockOrderCorporate: DEFAULT_ORDER_CORPORATE,
        blockOrderPortrait: DEFAULT_ORDER_PORTRAIT,
        blockOrderGaleries: DEFAULT_ORDER_GALERIES,
      });
    }
    const { data: visData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_visibility').maybeSingle();
    const { data: widthData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_width_mode').maybeSingle();
    const { data: orderHomeData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_home').maybeSingle();
    const { data: orderContactData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_contact').maybeSingle();
    const { data: orderAnimationData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_animation').maybeSingle();
    const { data: orderRealisationData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_realisation').maybeSingle();
    const { data: orderEvenementData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_evenement').maybeSingle();
    const { data: orderCorporateData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_corporate').maybeSingle();
    const { data: orderPortraitData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_portrait').maybeSingle();
    const { data: orderGaleriesData } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'block_order_galeries').maybeSingle();

    const raw = (visData as any)?.value;
    let hiddenBlocks: string[] = [];
    if (raw && typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        hiddenBlocks = Array.isArray(parsed) ? parsed : (parsed.hiddenBlocks && Array.isArray(parsed.hiddenBlocks) ? parsed.hiddenBlocks : []);
      } catch {
        // keep []
      }
    }
    const widthRaw = (widthData as any)?.value;
    let blockWidthModes: Record<string, 'full' | 'max1600'> = {};
    if (widthRaw && typeof widthRaw === 'string') {
      try {
        const parsed = JSON.parse(widthRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          blockWidthModes = parsed;
        }
      } catch {
        // keep {}
      }
    }
    const blockOrderHome = parseOrder((orderHomeData as any)?.value, DEFAULT_ORDER_HOME);
    const blockOrderContact = parseOrder((orderContactData as any)?.value, DEFAULT_ORDER_CONTACT);
    const blockOrderAnimation = parseOrder((orderAnimationData as any)?.value, DEFAULT_ORDER_ANIMATION);
    const blockOrderRealisation = parseOrder((orderRealisationData as any)?.value, DEFAULT_ORDER_REALISATION);
    const blockOrderEvenement = parseOrder((orderEvenementData as any)?.value, DEFAULT_ORDER_EVENEMENT);
    const blockOrderCorporate = parseOrder((orderCorporateData as any)?.value, DEFAULT_ORDER_CORPORATE);
    const blockOrderPortrait = parseOrder((orderPortraitData as any)?.value, DEFAULT_ORDER_PORTRAIT);
    const blockOrderGaleries = parseOrder((orderGaleriesData as any)?.value, DEFAULT_ORDER_GALERIES);

    return NextResponse.json({
      hiddenBlocks,
      blockWidthModes,
      blockOrderHome,
      blockOrderContact,
      blockOrderAnimation,
      blockOrderRealisation,
      blockOrderEvenement,
      blockOrderCorporate,
      blockOrderPortrait,
      blockOrderGaleries,
    });
  } catch (e) {
    console.error('block-visibility GET error', e);
    return NextResponse.json({
      hiddenBlocks: [],
      blockWidthModes: {},
      blockOrderHome: DEFAULT_ORDER_HOME,
      blockOrderContact: DEFAULT_ORDER_CONTACT,
      blockOrderAnimation: DEFAULT_ORDER_ANIMATION,
      blockOrderRealisation: DEFAULT_ORDER_REALISATION,
      blockOrderEvenement: DEFAULT_ORDER_EVENEMENT,
      blockOrderCorporate: DEFAULT_ORDER_CORPORATE,
      blockOrderPortrait: DEFAULT_ORDER_PORTRAIT,
      blockOrderGaleries: DEFAULT_ORDER_GALERIES,
    });
  }
}
