import { redirect } from '@sveltejs/kit';

// Root has no UI of its own; send visitors to the default locale.
// (Accept-Language detection can refine this later.)
export function load(): never {
	redirect(307, '/pt');
}
