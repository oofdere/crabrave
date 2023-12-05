import { defineConfig, passthroughImageService } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'crabrave',
			social: {
      github: 'https://github.com/oofdere/crabrave'
    }
  })],
  image: {
	service: passthroughImageService()
  }
});