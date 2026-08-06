{ pkgs, lib, config, inputs, ... }:

{
  packages = [ ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };
}
