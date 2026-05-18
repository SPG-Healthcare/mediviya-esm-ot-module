import { Type, validator } from '@openmrs/esm-framework';

/**
 * This is the config schema. It expects a configuration object which
 * looks like this:
 *
 * ```json
 * { "casualGreeting": true, "whoToGreet": ["Mom"] }
 * ```
 *
 * In OpenMRS Microfrontends, all config parameters are optional. Thus,
 * all elements must have a reasonable default. A good default is one
 * that works well with the reference application.
 *
 * To understand the schema below, please read the configuration system
 * documentation:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 * Note especially the section "How do I make my module configurable?"
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config?id=im-developing-an-esm-module-how-do-i-make-it-configurable
 * and the Schema Reference
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config?id=schema-reference
 */
export const configSchema = {
  otFreezeWindowDaysInAdvance: {
    _type: Type.Number,
    _default: 7,
    _description: 'Specify how many days in advance the OT appointment booking should be frozen.',
    _validators: [validator((v) => v >= 0, 'Cannot unfreeze past values. Enter 0 or positive number of days to freeze the schedule ahead.')],
  },
};

export type Config = {
  otFreezeWindowDaysInAdvance: number;
};
