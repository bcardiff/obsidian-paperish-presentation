# Pin nixpkgs to ensure all developers use the same version of devenv.
#
# To update: change the rev below and run:
#   nix-prefetch-url --unpack https://github.com/NixOS/nixpkgs/archive/<NEW_REV>.tar.gz
# Then replace the sha256 with the output.
{
  pkgs ? import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/871b9fd269ff6246794583ce4ee1031e1da71895.tar.gz";
    sha256 = "1zn1lsafn62sz6azx6j735fh4vwwghj8cc9x91g5sx2nrg23ap9k";
  }) {}
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    devenv
  ];

  shellHook = ''
    echo "devenv environment loaded"
  '';
}