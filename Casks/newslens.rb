cask "newslens" do
  arch arm: "aarch64-apple-darwin", intel: "x86_64-apple-darwin"

  version :latest
  sha256 :no_check

  url "https://github.com/Shuo-Han/NewsLens/releases/latest/download/newslens-#{arch}.tar.gz"
  name "NewsLens"
  desc "Turn your Claude Code into a News Agent"
  homepage "https://github.com/Shuo-Han/NewsLens"

  depends_on macos: ">= :monterey"

  app "NewsLens.app"
  binary "#{appdir}/NewsLens.app/Contents/MacOS/newslens", target: "newslens"
end
