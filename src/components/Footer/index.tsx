import React, { useState } from "react";
import styled from "styled-components";
import LightLogo from "../../static/logo-light.svg";
import DarkLogo from "../../static/logo-dark.svg";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { Box, Grid, Stack, Typography, Modal } from "@mui/material";
import { Link } from "react-router-dom";
import { currentVersion, deploymentVersion } from "@/contants/versions";

const FooterRoot = styled.footer`
  position: relative;
  width: 100%;
  border-top: 1px solid #eaebf0;
  padding-bottom: 40px;

  @media (min-width: 768px) {
    padding-bottom: 80px;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content; /* Hug (292px) */
  gap: 16px;
`;

const BrandLogo = styled.img`
  width: 140px;
  height: 28px;
`;

const Description = styled.div`
  font-size: 14px;
  line-height: 20px;
  font-family: Inter;
  font-weight: 200;
  letter-spacing: 0px;
  text-align: left;
  color: #68727d;

  @media (min-width: 768px) {
    font-size: 16px;
    line-height: 24px;
  }
`;

const FooterHeading = styled.h3`
  font-size: 20px;
  margin-bottom: 12px;
  font-family: Nohemi;
  font-weight: 600;
  letter-spacing: 0px;
  text-align: left;

  @media (min-width: 768px) {
    font-size: 24px;
  }
`;

const Copyright = styled.div`
  font-family: Inter;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0px;
  text-align: center;
  height: 24px;
  color: #68727d;
`;

const FooterLink = styled.li`
  font-family: Inter;
  font-size: 14px;
  font-weight: 300;
  line-height: 20px;
  letter-spacing: 0.10000000149011612px;
  text-align: left;
  color: #68727d;
  margin-top: 12px;
`;

const FooterList = styled.ul`
  padding: 0px;
  list-style: none;
`;

const SocialContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  align-self: stretch;
`;

const SocialHeading = styled.div`
  color: #161717;
  font-family: Nohemi;
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: 24px; /* 100% */
`;

const SocialButtonGroup = styled.div`
  display: flex;
  align-items: flex-end;
  gap: var(--Main-System-20px, 20px);
`;

const XIcon = () => {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.545847 0L11.7696 16.3631L0 30H2.50874L12.8814 17.9821L21.1246 30H29.0301L17.2852 12.8783L28.401 0H25.8938L16.175 11.2593L8.45138 0H0.545847Z"
        fill="white"
      />
    </svg>
  );
};

const DiscordIcon = () => {
  return (
    <svg
      width="43"
      height="30"
      viewBox="0 0 43 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36.9658 3.85709C36.364 2.94812 35.512 2.25282 34.5015 1.84863C32.3079 0.969043 30.4214 0.381462 28.7334 0.0502803C27.5494 -0.181191 26.3769 0.401048 25.8133 1.49787L25.6727 1.77207C24.4227 1.63408 23.0953 1.58778 21.5836 1.62607C20.0337 1.58867 18.7018 1.63408 17.4501 1.77207L17.3103 1.49787C16.7468 0.401048 15.5725 -0.180301 14.3911 0.0511705C12.7032 0.381462 10.8158 0.969044 8.62302 1.84953C7.61345 2.25371 6.76146 2.94812 6.15874 3.85798C1.95576 10.2065 0.308751 17.0545 1.12424 24.7946C1.15273 25.0661 1.30408 25.3091 1.53466 25.4543C4.76814 27.493 7.56627 28.8889 10.3404 29.8487C11.5004 30.2537 12.7868 29.8006 13.4715 28.7545L14.692 26.884C13.7198 26.5172 12.7708 26.0828 11.861 25.5638C11.4345 25.3207 11.2858 24.7768 11.5289 24.3503C11.7719 23.9221 12.3159 23.7716 12.7432 24.0182C15.4505 25.562 18.5113 26.3784 21.5943 26.3784C24.6773 26.3784 27.7381 25.562 30.4454 24.0182C30.8719 23.7716 31.4158 23.9221 31.6598 24.3503C31.9028 24.7768 31.7541 25.3207 31.3277 25.5638C30.3876 26.1006 29.4047 26.5475 28.3978 26.9205L29.654 28.7919C30.1712 29.562 31.025 30 31.9046 30C32.1913 30 32.4806 29.9528 32.7619 29.8567C35.544 28.8961 38.3475 27.4983 41.5881 25.4552C41.8187 25.31 41.97 25.0661 41.9985 24.7955C42.8158 17.0545 41.1688 10.2056 36.9658 3.85709ZM15.8752 19.2882C14.1605 19.2882 12.7494 17.4819 12.7494 15.2864C12.7494 13.091 14.1605 11.2847 15.8752 11.2847C17.5899 11.2847 19.001 13.091 19.001 15.2864C19.001 17.4819 17.5899 19.2882 15.8752 19.2882ZM27.4425 19.2651C25.7439 19.2651 24.3462 17.448 24.3462 15.2393C24.3462 13.0305 25.7439 11.2134 27.4425 11.2134C29.1412 11.2134 30.5389 13.0305 30.5389 15.2393C30.5389 17.448 29.1412 19.2651 27.4425 19.2651Z"
        fill="white"
      />
    </svg>
  );
};

const IconContainer = styled.div`
  display: grid;
  place-content: center;
  padding: 15px;
  align-items: flex-start;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  background: rgb(153, 51, 255);
  width: 40px;
  height: 40px;

  @media (min-width: 768px) {
    width: 50px;
    height: 50px;
    padding: 20px;
  }
`;

// Update modal style constant to use theme colors
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 800,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  overflow: "auto",
  borderRadius: 2,
};

const Footer: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);

  return (
    <FooterRoot
      className="md:py-20 md:px-16 p-4"
      style={{ background: isDarkTheme ? "rgb(22, 23, 23)" : undefined }}
    >
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} sm={12} md={6}>
          <Container>
            <BrandLogo src={isDarkTheme ? DarkLogo : LightLogo} />
            <Description>
              Join Nautilus and explore the dynamic world of digital art.
              Immerse yourself in a vibrant community of collectors and
              creators. Experience the thrill of discovery today.
            </Description>
            <SocialContainer>
              <SocialHeading>Join us</SocialHeading>
              <SocialButtonGroup>
                <Link to="https://x.com/NautilusNFTs" target="_blank">
                  <IconContainer>
                    <XIcon />
                  </IconContainer>
                </Link>
                <Link to="https://discord.gg/qp3FT47txs" target="_blank">
                  <IconContainer>
                    <DiscordIcon />
                  </IconContainer>
                </Link>
              </SocialButtonGroup>
            </SocialContainer>
          </Container>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Grid className="gap-3 md:gap-0" container spacing={3}>
            <Grid item xs={6} md={6}>
              <FooterHeading
                style={{
                  color: isDarkTheme ? "white" : undefined,
                }}
              >
                Marketplace
              </FooterHeading>
              <FooterList>
                <FooterLink>
                  <Link to="/listing">Listings</Link>
                </FooterLink>
                <FooterLink>
                </FooterLink>
                <FooterLink>
                  <Link to="/collection">Collections</Link>
                </FooterLink>

                <FooterLink>
                  <Link to="/sales-activity">Activity</Link>
                <FooterLink>
                  <Link to="/offers">Offers</Link>
                </FooterLink>                </FooterLink>
              </FooterList>
            </Grid>
            <Grid item xs={6} md={6}>
              <FooterHeading
                style={{
                  color: isDarkTheme ? "white" : undefined,
                }}
              >
                Links
              </FooterHeading>
              <FooterList>
                <FooterLink>
                  <Box
                    component="span"
                    onClick={() => setShowPrivacyPolicy(true)}
                    sx={{ cursor: "pointer" }}
                  >
                    Privacy Policy
                  </Box>
                </FooterLink>
                <FooterLink>
                  <Box
                    component="span"
                    onClick={() => setShowTerms(true)}
                    sx={{ cursor: "pointer" }}
                  >
                    Terms
                  </Box>
                </FooterLink>
                <FooterLink>
                  <Box
                    component="span"
                    onClick={() => setShowFAQs(true)}
                    sx={{ cursor: "pointer" }}
                  >
                    FAQs
                  </Box>
                </FooterLink>
                <FooterLink>
                  <Link
                    to="https://discord.com/channels/1055863853633785857/1205279834138480691"
                    target="_blank"
                  >
                    Report a Bug
                  </Link>
                </FooterLink>
              </FooterList>
            </Grid>
            <Grid item xs={6} md={6}>
              <FooterHeading
                style={{
                  color: isDarkTheme ? "white" : undefined,
                }}
              >
                Earn
              </FooterHeading>
              <FooterList>
                <FooterLink>
                  <Link to="/staking">Staking</Link>
                </FooterLink>
                <FooterLink>
                  <Link to="/community-chest?contract=390001">Wrapped Voi</Link>
                </FooterLink>
              </FooterList>
            </Grid>
            <Grid item xs={6} md={6}>
              <FooterHeading
                style={{
                  color: isDarkTheme ? "white" : undefined,
                }}
              >
                Tokens
              </FooterHeading>
              <FooterList>
                <FooterLink>
                  <Link to="/create-arc200">Launchpad</Link>
                </FooterLink>
              </FooterList>
            </Grid>
            <Grid item xs={6} md={6}>
              <FooterHeading
                style={{
                  color: isDarkTheme ? "white" : undefined,
                }}
              >
                Tools
              </FooterHeading>
              <FooterList>
                <FooterLink>
                  <Link to="/tools">Vibe Arcade</Link>
                </FooterLink>
              </FooterList>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ justifyContent: "space-between" }}
          >
            <Copyright>© 2024 Nautilus. All Rights Reserved.</Copyright>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Typography
            align="left"
            sx={{ color: isDarkTheme ? "white" : "black" }}
            variant="body2"
            color="textSecondary"
          >
            Ver {currentVersion}.{deploymentVersion}
          </Typography>
        </Grid>
      </Grid>
      <Modal
        open={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
        aria-labelledby="privacy-policy-modal"
      >
        <Box
          sx={{
            ...modalStyle,
            bgcolor: isDarkTheme ? "rgb(22, 23, 23)" : "background.paper",
            color: isDarkTheme ? "white" : "inherit",
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: isDarkTheme ? "white" : "inherit" }}
          >
            Privacy Policy
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: isDarkTheme ? "white" : "inherit",
              whiteSpace: "pre-line", // Preserve line breaks
            }}
          >
            {`Last updated: 14 April 2025

            At Nautilus, we prioritize your privacy by design. Our platform operates without collecting or storing any personal information.

            No Data Collection:
            • We do not collect or store any personal information
            • We do not track your activity or usage
            • We do not use cookies or similar tracking technologies
            • We do not maintain any user databases

            Blockchain Interactions:
            All interactions with the blockchain are performed directly through your wallet. These transactions are public on the blockchain by nature, but Nautilus does not collect or store this information.

            Third-Party Services:
            While our platform may integrate with blockchain networks and wallets, we do not receive or process any user data from these interactions.

            Changes to Privacy Policy:
            We may update this policy periodically. Check back regularly for updates.

            Contact:
            For any questions about our privacy practices, you can reach us through our community channels.`}
          </Typography>
        </Box>
      </Modal>
      <Modal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        aria-labelledby="terms-modal"
      >
        <Box
          sx={{
            ...modalStyle,
            bgcolor: isDarkTheme ? "rgb(22, 23, 23)" : "background.paper",
            color: isDarkTheme ? "white" : "inherit",
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: isDarkTheme ? "white" : "inherit" }}
          >
            Terms of Service
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: isDarkTheme ? "white" : "inherit",
              whiteSpace: "pre-line",
            }}
          >
            {`Last updated: 14 April 2025

            Welcome to Nautilus. By accessing or using our platform, you agree to these Terms of Service.

            1. Platform Usage
            • You must be of legal age in your jurisdiction
            • You are responsible for your wallet security
            • You agree to use the platform in compliance with applicable laws

            2. NFT Transactions
            • All NFT transactions are final and irreversible
            • You are responsible for verifying NFT authenticity
            • Transaction fees are non-refundable

            3. User Conduct
            • Do not engage in fraudulent activities
            • Do not interfere with platform operations
            • Respect intellectual property rights

            4. Risks
            • Cryptocurrency and NFT values are volatile
            • Smart contract interactions carry inherent risks
            • You assume all risks related to platform usage

            5. Modifications
            • We may modify these terms at any time
            • Continued use constitutes acceptance of changes

            6. Limitation of Liability
            • We are not liable for any losses or damages
            • Platform provided "as is" without warranties

            Contact us through community channels for questions about these terms.`}
          </Typography>
        </Box>
      </Modal>
      <Modal
        open={showFAQs}
        onClose={() => setShowFAQs(false)}
        aria-labelledby="faqs-modal"
      >
        <Box
          sx={{
            ...modalStyle,
            bgcolor: isDarkTheme ? "rgb(22, 23, 23)" : "background.paper",
            color: isDarkTheme ? "white" : "inherit",
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: isDarkTheme ? "white" : "inherit" }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: isDarkTheme ? "white" : "inherit",
              whiteSpace: "pre-line",
            }}
          >
            {`Last updated: 14 April 2025

            1. What is Nautilus?
            Nautilus is a decentralized marketplace for digital art and collectibles on the Voi blockchain.

            2. How do I get started?
            • Connect your compatible wallet
            • Browse listings or create your own
            • Make offers or purchase directly
            • Start collecting or creating

            3. What fees are involved?
            • Platform fees are transparent and on-chain
            • Transaction fees apply to all transactions
            • Creators set their own royalty fees

            4. How do I ensure my NFT's authenticity?
            • Verify collection contracts
            • Check creator addresses
            • Review transaction history
            • Use official links only

            5. What wallets are supported?
            Please check our supported wallets page for the most up-to-date list.

            6. How do I report issues?
            Use our bug report form or contact us through Discord for support.

            7. What about security?
            • Always verify transactions
            • Keep your wallet secure
            • Never share private keys
            • Be cautious of scams

            For more detailed information, join our Discord community or contact support.`}
          </Typography>
        </Box>
      </Modal>
    </FooterRoot>
  );
};

export default Footer;
