/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
		config.externals.push("@node-rs/argon2");
		return config;
	}
};

export default nextConfig;
